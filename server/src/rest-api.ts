import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcryptjs";
import { db } from "./db/knex";

dotenv.config();

export const app = express();

// Use CORS & JSON body parser middleware
app.use(cors());
app.use(express.json());

/**
 * Generates an 8-character random string to be used as the short URL identifier.
 * @returns {string} An 8-character string.
 */
const generateShortId = () => {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const length = 8;
  let result = "";
  for (let i = 0; i < length; i++) {
    result += characters.charAt(
      Math.floor(Math.random() * characters.length)
    );
  }
  return result;
};

/**
 * POST /secrets
 * Creates a secret share by splitting the submitted secret text into fragments and,
 * optionally, hashing a provided password.
 * Returns a short URL that can be used to retrieve the secret.
 */
app.post("/secrets", async (req, res) => {
  try {
    const { secretText, expiresDays, password } = req.body;
    const secretId = uuidv4();
    const shortId = generateShortId();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (expiresDays || 7));

    // Hash password if provided
    const passwordHash = password ? await bcrypt.hash(password, 10) : null;

    // Split the secret text into 2 fragments (for demonstration)
    const fragments = [];
    const fragmentSize = Math.ceil(secretText.length / 2);
    for (let i = 0; i < secretText.length; i += fragmentSize) {
      fragments.push(secretText.slice(i, i + fragmentSize));
    }

    // Insert the secret record (note: secret_text is left as null because fragments are stored separately)
    const secretRecord = await db("secrets")
      .insert({
        id: secretId,
        secret_text: null,
        expires_in_days: expiresDays,
        password_hash: passwordHash,
        created_at: new Date(),
        expires_at: expiresAt,
        fragment_count: fragments.length,
      })
      .returning("id");

    // Determine the inserted secret's ID (depending on your DB configuration, this could be an object or a plain string)
    const insertedSecretId =
      Array.isArray(secretRecord) && secretRecord.length > 0
        ? (secretRecord[0].id ? secretRecord[0].id : secretRecord[0])
        : secretId;

    // Store each fragment in the "secret_fragments" table
    await Promise.all(
      fragments.map((fragment, index) =>
        db("secret_fragments").insert({
          secret_id: insertedSecretId,
          fragment: fragment,
          order: index,
        })
      )
    );

    // Save the short URL mapping in the "secret_mappings" table
    await db("secret_mappings").insert({
      secret_id: insertedSecretId,
      short_id: shortId,
      created_at: new Date(),
      expires_at: expiresAt,
    });

    // Return the generated short URL and expiration time
    res.json({
      shortUrl: `http://localhost:3000/share/${shortId}`,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    console.error("Error creating secret:", error);
    res.status(500).json({ error: "Failed to create secret" });
  }
});

/**
 * GET /secrets/:shortId
 * Retrieves a secret share based on the provided short URL.
 * If the secret is password-protected, informs the client that a password is required.
 */
app.get("/secrets/:shortId", async (req, res) => {
  try {
    const { shortId } = req.params;

    // Retrieve valid secret mapping
    const secretMapping = await db("secret_mappings")
      .where("short_id", shortId)
      .andWhere("expires_at", ">", new Date())
      .first();

    if (!secretMapping) {
      return res.status(404).json({ error: "Secret not found or expired" });
    }

    const secretId = secretMapping.secret_id;
    const secret = await db("secrets").where("id", secretId).first();

    if (!secret) {
      // Clean up mapping if secret record missing
      await db("secret_mappings").where("short_id", shortId).del();
      return res.status(404).json({ error: "Secret not found" });
    }

    // If the secret has expired, delete both records and respond accordingly.
    if (new Date(secret.expires_at) < new Date()) {
      await db("secrets").where("id", secretId).del();
      await db("secret_mappings").where("short_id", shortId).del();
      return res.status(410).json({ error: "Secret has expired" });
    }

    // Inform client if password is required
    if (secret.password_hash) {
      return res.json({ secretText: null, passwordRequired: true });
    }

    // Retrieve and reassemble secret fragments in correct order
    const fragments = await db("secret_fragments")
      .where("secret_id", secretId)
      .orderBy("order", "asc")
      .select("fragment");
    const secretText = fragments.reduce(
      (acc, { fragment }) => acc + fragment,
      ""
    );

    if (!secretText) {
      return res.status(404).json({ error: "Secret fragments not found" });
    }

    res.json({ secretText });
  } catch (error) {
    console.error("Error retrieving secret:", error);
    res.status(500).json({ error: "Failed to retrieve secret" });
  }
});

/**
 * POST /secrets/:shortId
 * Validates the submitted password for a password-protected secret.
 * If valid (or if no password is set), returns the reassembled secret.
 * If the password is incorrect, returns a 401 with a clear error message.
 */
app.post("/secrets/:shortId", async (req, res) => {
  try {
    const { shortId } = req.params;
    const { password } = req.body;

    // Retrieve valid secret mapping
    const secretMapping = await db("secret_mappings")
      .where("short_id", shortId)
      .andWhere("expires_at", ">", new Date())
      .first();

    if (!secretMapping) {
      return res.status(404).json({ error: "Secret not found or expired" });
    }

    const secretId = secretMapping.secret_id;
    const secret = await db("secrets").where("id", secretId).first();
    if (!secret) {
      await db("secret_mappings").where("short_id", shortId).del();
      return res.status(404).json({ error: "Secret not found" });
    }
    if (new Date(secret.expires_at) < new Date()) {
      await db("secrets").where("id", secretId).del();
      await db("secret_mappings").where("short_id", shortId).del();
      return res.status(410).json({ error: "Secret has expired" });
    }

    // If password is required, validate the submitted value.
    if (secret.password_hash) {
      if (!password) {
        return res.json({ secretText: null, passwordRequired: true });
      }
      const isValidPassword = await bcrypt.compare(
        password,
        secret.password_hash
      );
      if (!isValidPassword) {
        return res
          .status(401)
          .json({ error: "Password is incorrect, please try again" });
      }
    }

    // Reassemble and return secret text.
    const fragments = await db("secret_fragments")
      .where("secret_id", secretId)
      .orderBy("order", "asc")
      .select("fragment");
    const secretText = fragments.reduce(
      (acc, { fragment }) => acc + fragment,
      ""
    );

    res.json({ secretText });
  } catch (error) {
    console.error("Error retrieving secret:", error);
    res.status(500).json({ error: "Failed to retrieve secret" });
  }
});

// Start the backend server
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  // Minimal logging on startup
  console.info(`Server running on http://localhost:${PORT}`);
});
