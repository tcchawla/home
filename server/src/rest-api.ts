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

const generateShortId = () => {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0, len = 8; i < len; i++) {
    result += characters.charAt(
      Math.floor(Math.random() * characters.length)
    );
  }
  return result;
};

const formatExpiration = (expiration: Date): string => {
  const now = new Date();
  const diff = expiration.getTime() - now.getTime();
  if (diff <= 0) return "Secret has expired";
  const seconds = Math.floor((diff / 1000) % 60);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  return `Expires on ${expiration.toLocaleString()} i.e. in (${days} days, ${hours} hours, ${minutes} minutes and ${seconds} seconds)`;
};

app.post("/secrets", async (req, res) => {
  try {
    const {
      secretText,
      expiresDays,
      expiresMinutes, // optional
      password,
      checked,
      email
    } = req.body;
    const secretId = uuidv4();
    const shortId = generateShortId();
    const now = new Date();
    const days = expiresDays != null ? expiresDays : 7;
    const minutes = expiresMinutes != null ? expiresMinutes : 0;
    const expiresAt = new Date(now);
    expiresAt.setDate(expiresAt.getDate() + days);
    expiresAt.setMinutes(expiresAt.getMinutes() + minutes);
    const passwordHash = password ? await bcrypt.hash(password, 10) : null;
    const isExtendable = !!checked;
    const emailSender = isExtendable ? email : null;
    const fragments: string[] = [];
    const fragmentSize = Math.ceil(secretText.length / 2);
    for (let i = 0; i < secretText.length; i += fragmentSize) {
      fragments.push(secretText.slice(i, i + fragmentSize));
    }
    const secretRecord = await db("secrets")
      .insert({
        id: secretId,
        secret_text: null,
        expires_in_days: expiresDays,
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
        ? (secretRecord[0].id || secretRecord[0])
        : secretId;
    await Promise.all(
      fragments.map((fragment, index) =>
        db("secret_fragments").insert({
          secret_id: insertedSecretId,
          fragment,
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

app.post(
  "/secrets/:shortId",
  async (
    req: Request<{ shortId: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { shortId } = req.params;
      const { password } = req.body;
      const secretMapping = await db("secret_mappings")
        .where("short_id", shortId)
        .first();
      if (!secretMapping) {
        res.status(404).json({ error: "Secret not found" });
        return;
      }
      const expirationDate = new Date(secretMapping.expires_at);
      const now = new Date();
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
      if (secret.password_hash) {
        if (!password) {
          res.json({ secretText: null, passwordRequired: true });
          return;
        }
        const isValidPassword = await bcrypt.compare(
          password,
          secret.password_hash
        );
        if (!isValidPassword) {
          res.status(401).json({ error: "Password is incorrect, please try again" });
          return;
        }
      }
      const fragments = await db("secret_fragments")
        .where("secret_id", secretId)
        .orderBy("order", "asc")
        .select("fragment");
      const secretText = fragments.reduce(
        (acc, { fragment }) => acc + fragment,
        ""
      );
      const remainingTime = formatExpiration(expirationDate);
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

/* Single admin endpoint to list expired records, and update extension.
   If the request body has email, secretId, expiresDays/expiresMinutes, it updates;
   Otherwise, it lists expired email records.
*/
app.post(
  "/admin/extend",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email, secretId, expiresDays, expiresMinutes } = req.body;
      const now = new Date();
      if (email && secretId && (typeof expiresDays === "number" || typeof expiresMinutes === "number")) {
        const days = expiresDays ?? 0;
        const minutes = expiresMinutes ?? 0;
        const newExpiresAt = new Date(now);
        newExpiresAt.setDate(newExpiresAt.getDate() + days);
        newExpiresAt.setMinutes(newExpiresAt.getMinutes() + minutes);
        const updated = await db("emails")
          .where({ secret_id: secretId, email })
          .update({ expires_at: newExpiresAt });
        if (!updated) {
          res.status(404).json({ error: "Record not found for update" });
          return;
        }
        const remainingTime = formatExpiration(newExpiresAt);
        res.json({
          message: "Secret extension updated",
          expiresAt: newExpiresAt.toISOString(),
          remainingTime,
        });
        return;
      }
      const expiredEmails = await db("emails")
        .join("secret_mappings", "emails.secret_id", "secret_mappings.secret_id")
        .where("emails.expires_at", "<=", now)
        .select(
          "secret_mappings.short_id as shortId",
          "emails.email",
          "emails.expires_at",
          "emails.id as emailRecordId",
          "emails.secret_id"
        );
      const formatted = expiredEmails.map(record => ({
        ...record,
        expiresAtHuman: formatExpiration(new Date(record.expires_at))
      }));
      res.json({ expiredEmails: formatted });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to process admin extension" });
    }
  }
);

// New endpoint for retrieving an extended secret based on a given email.
app.post(
  "/secrets/:shortId/extended",
  async (req: Request<{ shortId: string }>, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { shortId } = req.params;
      const { email } = req.body;
      if (!email) {
        res.status(400).json({ error: "Email is required" });
        return;
      }
      // Get the mapping record (using shortId)
      const secretMapping = await db("secret_mappings")
        .where("short_id", shortId)
        .first();
      if (!secretMapping) {
        res.status(404).json({ error: "Secret not found" });
        return;
      }
      const secretId = secretMapping.secret_id;
      // Look up the email record in the emails table
      const emailRecord = await db("emails")
        .where({ secret_id: secretId, email })
        .first();
      if (!emailRecord) {
        res.status(403).json({ error: "Extended access not granted for this email" });
        return;
      }
      const expirationDate = new Date(emailRecord.expires_at);
      const now = new Date();
      if (expirationDate <= now) {
        res.status(410).json({
          error: "Extended secret access expired",
          expiresAt: expirationDate.toISOString()
        });
        return;
      }
      // Reassemble secret text from fragments
      const fragments = await db("secret_fragments")
        .where("secret_id", secretId)
        .orderBy("order", "asc")
        .select("fragment");
      const secretText = fragments.reduce((acc, { fragment }) => acc + fragment, "");
      const remainingTime = formatExpiration(expirationDate);
      res.json({
        secretText,
        expiresAt: expirationDate.toISOString(),
        remainingTime
      });
    } catch (error) {
      console.error("Error retrieving extended secret:", error);
      res.status(500).json({ error: "Failed to retrieve extended secret" });
    }
  }
);


const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.info(`Server running on http://localhost:${PORT}`);
});
