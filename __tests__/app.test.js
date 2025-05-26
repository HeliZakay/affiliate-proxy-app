// __tests__/app.test.js
import request from "supertest";
import app from "../app.js";
import redisClient from "../redisClient.js";
import { API_KEY } from "../config.js";

describe("Integration tests (Redis-backed with timestamp)", () => {
  beforeAll(async () => {
    // Redis client is initialized in redisClient.js
  });

  beforeEach(async () => {
    // Clear all Redis keys between tests
    await redisClient.flushAll();
  });

  afterAll(async () => {
    // Close Redis connection
    await redisClient.quit();
  });

  describe("GET / (redirect)", () => {
    it("should 302-redirect and generate our_param, persisting it (with timestamp) in Redis", async () => {
      const res = await request(app)
        .get("/")
        .query({ keyword: "shoes", src: "google", creative: "1234" });

      expect(res.status).toBe(302);
      const location = res.headers.location;
      expect(location).toMatch(/our_param=[A-Za-z0-9_-]{10}$/);

      const ourParam = location.split("=")[1];
      // Verify Redis hash fields
      const entry = await redisClient.hGetAll("map:shoes:google:1234");
      expect(entry.our_param).toBe(ourParam);
      expect(entry.created_at).toBeDefined();
      // created_at should be a valid ISO string
      expect(new Date(entry.created_at).toString()).not.toBe("Invalid Date");
    });

    it("should generate a new our_param when refresh=true", async () => {
      const first = await request(app)
        .get("/")
        .query({ keyword: "test", src: "src", creative: "1" });
      const param1 = first.headers.location.split("=")[1];

      const second = await request(app)
        .get("/")
        .query({ keyword: "test", src: "src", creative: "1", refresh: "true" });
      const param2 = second.headers.location.split("=")[1];

      expect(param2).not.toBe(param1);
    });
  });

  describe("GET /retrieve_original", () => {
    it("returns original mapping and timestamp when our_param exists", async () => {
      const fake = { keyword: "shoes", src: "google", creative: "1234" };
      const ourParam = "ABCDEFGHIJ";
      // Prime Redis hash with fields
      await redisClient.hSet(`rev:${ourParam}`, {
        payload: JSON.stringify(fake),
        created_at: "2025-01-01T00:00:00.000Z",
      });

      const res = await request(app)
        .get("/retrieve_original")
        .set("x-api-key", API_KEY)
        .query({ our_param: ourParam });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        ...fake,
        created_at: "2025-01-01T00:00:00.000Z",
      });
    });

    it("returns 401 when API key is missing", async () => {
      const res = await request(app)
        .get("/retrieve_original")
        .query({ our_param: "ABCDEFGHIJ" });
      expect(res.status).toBe(401);
    });

    it("returns 400 when our_param is missing", async () => {
      const res = await request(app)
        .get("/retrieve_original")
        .set("x-api-key", API_KEY);
      expect(res.status).toBe(400);
    });

    it("returns 404 when mapping not found", async () => {
      const res = await request(app)
        .get("/retrieve_original")
        .set("x-api-key", API_KEY)
        .query({ our_param: "NOTEXIST" });

      expect(res.status).toBe(404);
    });
  });
});
