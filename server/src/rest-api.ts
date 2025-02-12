import dotenv from "dotenv";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcryptjs";
import { db } from "./db/knex";

dotenv.config();

export const app = express();

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
 * Helper function to format the remaining time until expiration.
 * @param expiration The expiration Date object.
 * @returns {string} A human-readable string.
 */
const formatRemainingTime = (expiration: Date): string => {
  const now = new Date();
  const diff = expiration.getTime() - now.getTime();
  if (diff <= 0) return "Secret has expired";
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return `${days} days, ${hours} hours, and ${minutes} minutes remaining`;
};

/**
 * POST /secrets
 * Creates a secret share by splitting the submitted secret text into fragments and,
 * optionally, hashing a provided password.
 * Returns a short URL that can be used to retrieve the secret.
 */
app.post("/secrets", async (req, res) => {
  try {
    // Accept expiresDays (and optionally expiresMinutes) from the client.
    // If expiresDays is not provided, default to 7 days; we don't store minutes separately.
    const {
      secretText,
      expiresDays,
      expiresMinutes, // optional, used in computing the expiration
      password,
      checked,
      email
    } = req.body;
    const secretId = uuidv4();
    const shortId = generateShortId();

    // Calculate expiration timestamp
    const now = new Date();
    const days = expiresDays !== undefined && expiresDays !== null ? expiresDays : 7;
    const minutes = expiresMinutes !== undefined && expiresMinutes !== null ? expiresMinutes : 0;
    const expiresAt = new Date(now);
    expiresAt.setDate(expiresAt.getDate() + days);
    expiresAt.setMinutes(expiresAt.getMinutes() + minutes);

    // Hash password if provided.
    const passwordHash = password ? await bcrypt.hash(password, 10) : null;
    const isExtendable = checked ? true : false;
    const emailSender = isExtendable ? email : null;

    // Split the secret text into 2 fragments.
    const fragments: string[] = [];
    const fragmentSize = Math.ceil(secretText.length / 2);
    for (let i = 0; i < secretText.length; i += fragmentSize) {
      fragments.push(secretText.slice(i, i + fragmentSize));
    }

    // Insert the secret record (secret_text remains null, fragments are stored separately)
    const secretRecord = await db("secrets")
      .insert({
        id: secretId,
        secret_text: null,
        expires_in_days: expiresDays, // we still store days for reference
        password_hash: passwordHash,
        created_at: now,
        expires_at: expiresAt,
        fragment_count: fragments.length,
        extendable: isExtendable,
        email: emailSender
      })
      .returning("id");

    if (email) {
      await db("emails").insert({
        secret_id: secretId,
        email: email,
        expires_at: expiresAt
      });
    }

    const insertedSecretId =
      Array.isArray(secretRecord) && secretRecord.length > 0
        ? (secretRecord[0].id ? secretRecord[0].id : secretRecord[0])
        : secretId;

    await Promise.all(
      fragments.map((fragment, index) =>
        db("secret_fragments").insert({
          secret_id: insertedSecretId,
          fragment: fragment,
          order: index
        })
      )
    );

    await db("secret_mappings").insert({
      secret_id: insertedSecretId,
      short_id: shortId,
      created_at: now,
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

/**
 * POST /secrets/:shortId
 * Validates the submitted password (if required) and returns the reassembled secret,
 * provided the secret is not expired. If expired, responds with HTTP 410 along with the expiration timestamp.
 */
app.post(
  "/secrets/:shortId",
  async (req: Request<{ shortId: string }>, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { shortId } = req.params;
      const { password } = req.body;

      // Retrieve the secret mapping using the short URL.
      const secretMapping = await db("secret_mappings")
        .where("short_id", shortId)
        .first();

      if (!secretMapping) {
        res.status(404).json({ error: "Secret not found" });
        return;
      }

      const expirationDate = new Date(secretMapping.expires_at);
      console.log(expirationDate)
      const now = new Date();

      // If secret has expired, return HTTP 410 with the proper expiration timestamp.
      if (expirationDate <= now) {
        res.status(410).json({
          error: "Secret has expired",
          expiresAt: expirationDate.toISOString()
        });
        return;
      }

      const secretId = secretMapping.secret_id;
      const secret = await db("secrets").where("id", secretId).first();
      if (!secret) {
        res.status(404).json({ error: "Secret not found" });
        return;
      }

      // If password protection is enabled, verify the provided password.
      if (secret.password_hash) {
        if (!password) {
          res.json({ secretText: null, passwordRequired: true });
          return;
        }
        const isValidPassword = await bcrypt.compare(password, secret.password_hash);
        if (!isValidPassword) {
          res.status(401).json({ error: "Password is incorrect, please try again" });
          return;
        }
      }

      // Reassemble secret text from fragments.
      const fragments = await db("secret_fragments")
        .where("secret_id", secretId)
        .orderBy("order", "asc")
        .select("fragment");
      const secretText = fragments.reduce((acc, { fragment }) => acc + fragment, "");

      // Compute remaining time on the server side.
      const remainingTime = formatRemainingTime(expirationDate);
      console.log(remainingTime)
      res.json({
        secretText,
        expiresAt: expirationDate.toISOString(),
        remainingTime
      });
    } catch (error) {
      console.error("Error retrieving secret:", error);
      res.status(500).json({ error: "Failed to retrieve secret" });
    }
  }
);

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.info(`Server running on http://localhost:${PORT}`);
});
