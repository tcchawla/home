import request from "supertest";
import { app } from "../rest-api"; // Export your Express app from rest-api.ts
import { db } from "../db/knex";

// Example of testing secret creation and retrieval
describe("Secret API Endpoints", () => {
  // Close DB connection after tests
  afterAll(async () => {
    await db.destroy();
  });

  test("POST /secrets should create a secret and return a short URL", async () => {
    const response = await request(app).post("/secrets").send({
      secretText: "Test secret",
      expiresDays: 7,
      password: "",
    });
    expect(response.status).toBe(200);
    expect(response.body.shortUrl).toMatch(/http:\/\/localhost:3000\/share\/\w{8}/);
  });

  test("GET /secrets/:shortId should return passwordRequired if secret is password protected", async () => {
    // Create a new secret with a password
    const createResponse = await request(app).post("/secrets").send({
      secretText: "Password secret",
      expiresDays: 7,
      password: "mypassword",
    });
    expect(createResponse.status).toBe(200);
    // Extract the shortId from the URL
    const shortUrl: string = createResponse.body.shortUrl;
    const shortId = shortUrl.split("/").pop();

    // Attempt to retrieve without password
    const getResponse = await request(app).get(`/secrets/${shortId}`);
    expect(getResponse.status).toBe(200);
    expect(getResponse.body.passwordRequired).toBe(true);
  });
});
