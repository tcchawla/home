import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { db } from "./db/knex";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Generate random string for short URL
const generateShortId = () => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const length = 8;
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
};

// Create secret endpoint
app.post("/secrets", async (req, res) => {
  try {
    const { secretText, expiresDays, password } = req.body;

    // Generate UUID for secret ID
    const secretId = uuidv4();

    // Generate short ID for URL
    const shortId = generateShortId();

    // Calculate expiration date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (expiresDays || 7));

    // Hash password if provided
    const passwordHash = password ? await bcrypt.hash(password, 10) : null;

    // Split secret into fragments
    const fragments = [];
    const fragmentSize = Math.ceil(secretText.length / 2); // Split into 2 fragments
    for (let i = 0; i < secretText.length; i += fragmentSize) {
      fragments.push(secretText.slice(i, i + fragmentSize));
    }

    // Insert into database
    const [secret] = await db("secrets").insert({
      id: secretId,
      secret_text: null, // We store fragments separately
      expires_in_days: expiresDays,
      password_hash: passwordHash,
      created_at: new Date(),
      expires_at: expiresAt,
      fragment_count: fragments.length
    }).returning("id");

    // Insert fragments
    await Promise.all(fragments.map((fragment, index) =>
      db("secret_fragments").insert({
        secret_id: secret.id,
        fragment: fragment,
        order: index
      })
    ));

    // Insert short ID mapping
    await db("secret_mappings").insert({
      secret_id: secret.id,
      short_id: shortId,
      created_at: new Date(),
      expires_at: expiresAt
    });

    res.json({
      shortUrl: `http://localhost:3000/share/${shortId}`,
      expiresAt: expiresAt.toISOString()
    });

  } catch (error) {
    console.error("Error creating secret:", error);
    res.status(500).json({ error: "Failed to create secret" });
  }
});

// Get secret endpoint
app.get("/secrets/:shortId", async (req, res) => {
  try {
    const { shortId } = req.params;
    console.log(`Attempting to retrieve secret with shortId: ${shortId}`);

    // Find secret mapping by short ID
    const [secretMapping] = await db("secret_mappings")
      .where("short_id", shortId)
      .andWhere("expires_at", ">", new Date())
      .first();

    console.log(`Secret Mapping Found: ${JSON.stringify(secretMapping)}`);

    if (!secretMapping) {
      console.log(`Secret not found or expired for shortId: ${shortId}`);
      return res.status(404).json({ error: "Secret not found or expired" });
    }

    const { secret_id } = secretMapping;
    console.log(`Secret ID: ${secret_id}`);

    // Get secret details
    const [secret] = await db("secrets").where("id", secret_id).first();
    console.log(`Secret Details: ${JSON.stringify(secret)}`);

    if (!secret) {
      await db("secret_mappings").where("short_id", shortId).del();
      console.log(`Secret not found, deleting mapping for shortId: ${shortId}`);
      return res.status(404).json({ error: "Secret not found" });
    }

    if (new Date(secret.expires_at) < new Date()) {
      await db("secrets").where("id", secret_id).del();
      await db("secret_mappings").where("short_id", shortId).del();
      console.log(`Secret expired, deleting records for shortId: ${shortId}`);
      return res.status(410).json({ error: "Secret has expired" });
    }

    // Get fragments using a single query with join
    const query = `
      SELECT s.*, sf.fragment, sf.order
      FROM secrets s
      LEFT JOIN secret_fragments sf ON s.id = sf.secret_id
      WHERE s.id = '${secret_id}'
      ORDER BY sf.order;
    `;

    const result = await db.raw(query);
    console.log(`Query Result: ${JSON.stringify(result)}`);

    const secretText = result.rows.reduce((acc, row) => acc + row.fragment, '');
    console.log(`Secret Text: ${secretText}`);

    // If password is required, prompt user
    if (secret.password_hash) {
      console.log(`Password required for secret with shortId: ${shortId}`);
      return res.json({ secretText: null, passwordRequired: true });
    }

    if (!secretText) {
      console.log(`No secret text found for shortId: ${shortId}`);
      return res.status(404).json({ error: "Secret fragments not found" });
    }

    console.log(`Successfully retrieved secret text: ${secretText}`);
    res.json({ secretText });

  } catch (error) {
    console.error(`Error retrieving secret: ${error.message}`);
    console.error(`Error stack: ${error.stack}`);
    res.status(500).json({ error: "Failed to retrieve secret" });
  }
});



// Post secret endpoint for password submission
app.post("/secrets/:shortId", async (req, res) => {
  try {
    const { shortId } = req.params;
    const { password } = req.body;

    // Find secret mapping by short ID
    const [secretMapping] = await db("secret_mappings")
      .where("short_id", shortId)
      .andWhere("expires_at", ">", new Date())
      .first();

    if (!secretMapping) {
      return res.status(404).json({ error: "Secret not found or expired" });
    }

    const { secret_id } = secretMapping;

    // Get secret details
    const [secret] = await db("secrets").where("id", secret_id).first();

    if (!secret) {
      await db("secret_mappings").where("short_id", shortId).del();
      return res.status(404).json({ error: "Secret not found" });
    }

    if (new Date(secret.expires_at) < new Date()) {
      await db("secrets").where("id", secret_id).del();
      await db("secret_mappings").where("short_id", shortId).del();
      return res.status(410).json({ error: "Secret has expired" });
    }

    // Verify password if required
    if (secret.password_hash) {
      const isValidPassword = await bcrypt.compare(password, secret.password_hash);
      if (!isValidPassword) {
        return res.status(401).json({ error: "Invalid password" });
      }
    }

    // Get fragments
    const fragments = await db("secret_fragments")
      .where("secret_id", secret_id)
      .orderBy("order", "asc")
      .select("fragment");

    // Ensure fragments is an array
    const fragmentArray = Array.isArray(fragments) ? fragments : [];

    // Reassemble secret
    const secretText = fragmentArray.map(f => f.fragment).join('');

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
