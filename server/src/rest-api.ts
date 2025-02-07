import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcryptjs";
import { db } from "./db/knex";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Helper function to generate a random 8-character string for short URLs
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

// -----------------------------------------------------------------------
// POST /secrets
// Create a new secret (splitting it into fragments and optionally hashing a provided password)
app.post("/secrets", async (req, res) => {
  try {
    const { secretText, expiresDays, password } = req.body;

    // Generate unique identifiers and calculate the expiration date
    const secretId = uuidv4();
    const shortId = generateShortId();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (expiresDays || 7));

    // Hash password if provided
    const passwordHash = password ? await bcrypt.hash(password, 10) : null;

    // Split the secret into 2 fragments (for example purposes)
    const fragments = [];
    const fragmentSize = Math.ceil(secretText.length / 2);
    for (let i = 0; i < secretText.length; i += fragmentSize) {
      fragments.push(secretText.slice(i, i + fragmentSize));
    }

    // Insert secret record into the "secrets" table (note: secret_text is not directly stored since we use fragments)
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

    // Extract the UUID string from the returned object (if necessary)
    const insertedSecretId =
      Array.isArray(secretRecord) && secretRecord.length > 0
        ? (secretRecord[0].id ? secretRecord[0].id : secretRecord[0])
        : secretId;

    // Insert each fragment into the "secret_fragments" table
    await Promise.all(
      fragments.map((fragment, index) =>
        db("secret_fragments").insert({
          secret_id: insertedSecretId,
          fragment: fragment,
          order: index,
        })
      )
    );

    // Insert a short URL mapping in the "secret_mappings" table
    await db("secret_mappings").insert({
      secret_id: insertedSecretId,
      short_id: shortId,
      created_at: new Date(),
      expires_at: expiresAt,
    });

    res.json({
      shortUrl: `http://localhost:3000/share/${shortId}`,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    console.error("Error creating secret:", error);
    res.status(500).json({ error: "Failed to create secret" });
  }
});

// -----------------------------------------------------------------------
// GET /secrets/:shortId
// Retrieve a secret by its short URL. If the secret is password-protected,
// this endpoint signals that a password must be submitted.
app.get("/secrets/:shortId", async (req, res) => {
  try {
    const { shortId } = req.params;
    console.log(`Attempting to retrieve secret with shortId: ${shortId}`);

    // Find the secret mapping that is still valid
    const secretMapping = await db("secret_mappings")
      .where("short_id", shortId)
      .andWhere("expires_at", ">", new Date())
      .first();

    console.log(`Secret Mapping Found: ${JSON.stringify(secretMapping)}`);

    if (!secretMapping) {
      console.log(
        `Secret mapping not found or expired for shortId: ${shortId}`
      );
      return res.status(404).json({ error: "Secret not found or expired" });
    }

    const secretId = secretMapping.secret_id;
    console.log(`Secret ID: ${secretId}`);

    // Retrieve the secret details from the "secrets" table
    const secret = await db("secrets").where("id", secretId).first();
    console.log(`Secret Details: ${JSON.stringify(secret)}`);

    if (!secret) {
      // Cleanup if the secret record is missing
      await db("secret_mappings").where("short_id", shortId).del();
      console.log(`Secret not found, mapping deleted for shortId: ${shortId}`);
      return res.status(404).json({ error: "Secret not found" });
    }

    // Check if the secret has expired
    if (new Date(secret.expires_at) < new Date()) {
      await db("secrets").where("id", secretId).del();
      await db("secret_mappings").where("short_id", shortId).del();
      console.log(`Secret expired, records deleted for shortId: ${shortId}`);
      return res.status(410).json({ error: "Secret has expired" });
    }

    // If the secret is password-protected, signal to the client that a password is required.
    if (secret.password_hash) {
      console.log(`Password required for secret with shortId: ${shortId}`);
      return res.json({ secretText: null, passwordRequired: true });
    }

    // Retrieve and order the fragments from the "secret_fragments" table and reassemble the complete secret text.
    const fragments = await db("secret_fragments")
      .where("secret_id", secretId)
      .orderBy("order", "asc")
      .select("fragment");
    const secretText = fragments.reduce(
      (acc, { fragment }) => acc + fragment,
      ""
    );

    console.log(`Secret Text: ${secretText}`);

    if (!secretText) {
      console.log(`No secret fragments found for shortId: ${shortId}`);
      return res.status(404).json({ error: "Secret fragments not found" });
    }

    res.json({ secretText });
  } catch (error) {
    console.error(`Error retrieving secret: ${error.message}`);
    console.error(`Error stack: ${error.stack}`);
    res.status(500).json({ error: "Failed to retrieve secret" });
  }
});

// -----------------------------------------------------------------------
// POST /secrets/:shortId
// Endpoint to submit a password for a password-protected secret or,
// if no password is provided, signal that one is required.
app.post("/secrets/:shortId", async (req, res) => {
  try {
    const { shortId } = req.params;
    const { password } = req.body;

    // Find the valid secret mapping
    const secretMapping = await db("secret_mappings")
      .where("short_id", shortId)
      .andWhere("expires_at", ">", new Date())
      .first();

    if (!secretMapping) {
      return res
        .status(404)
        .json({ error: "Secret not found or expired" });
    }

    const secretId = secretMapping.secret_id;

    // Retrieve secret details
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

    // If the secret is password-protected, check if a password was provided.
    // Instead of returning a 400 error immediately, return a response signaling password is required.
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

    // Retrieve and assemble the secret fragments
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

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
