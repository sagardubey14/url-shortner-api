jest.mock("../src/config/db");
jest.mock("../src/config/redis");

const request = require("supertest");
const db = require("../src/config/db");
const redis = require("../src/config/redis");
const app = require("../src/app");

describe("GET /health", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("returns 200 and all healthy when Mongo primary/secondary and Redis all respond", async () => {
    db.pingPrimary.mockResolvedValue();
    db.pingSecondary.mockResolvedValue();
    redis.ping.mockResolvedValue();

    const res = await request(app).get("/health");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      write: "healthy",
      read: "healthy",
      redis: "healthy",
    });
  });

  it("returns 503 and marks only the failing check unhealthy when Mongo primary is unreachable", async () => {
    db.pingPrimary.mockRejectedValue(new Error("primary unreachable"));
    db.pingSecondary.mockResolvedValue();
    redis.ping.mockResolvedValue();

    const res = await request(app).get("/health");

    expect(res.status).toBe(503);
    expect(res.body).toEqual({
      write: "unhealthy",
      read: "healthy",
      redis: "healthy",
    });
  });

  it("returns 503 and marks only redis unhealthy when Redis is unreachable", async () => {
    db.pingPrimary.mockResolvedValue();
    db.pingSecondary.mockResolvedValue();
    redis.ping.mockRejectedValue(new Error("redis unreachable"));

    const res = await request(app).get("/health");

    expect(res.status).toBe(503);
    expect(res.body).toEqual({
      write: "healthy",
      read: "healthy",
      redis: "unhealthy",
    });
  });
});
