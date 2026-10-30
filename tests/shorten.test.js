// This file sends more than the 10/min shorten limit; rate limiting has its own suite.
jest.mock("../src/middlewares/rate-limit.middleware", () => {
  const passThrough = (req, res, next) => next();
  return { shortenLimiter: passThrough, apiLimiter: passThrough };
});
jest.mock("../src/models/url.model");
jest.mock("../src/models/user.model");
jest.mock("../src/services/shorten.service");
jest.mock("../src/services/metadata.service");

const request = require("supertest");
const Url = require("../src/models/url.model");
const User = require("../src/models/user.model");
const shortenService = require("../src/services/shorten.service");
const metadataService = require("../src/services/metadata.service");
const app = require("../src/app");
const { authHeader } = require("./helpers");

describe("POST /api/shorten", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("schedules a metadata fetch for the new link without blocking the response", async () => {
    shortenService.getNextShortCode.mockResolvedValue("aB3xY9");
    Url.create.mockResolvedValue({
      shortCode: "aB3xY9",
      longUrl: "https://example.com/page",
    });

    const res = await request(app)
      .post("/api/shorten")
      .set("Authorization", authHeader())
      .send({ longUrl: "https://example.com/page" });

    expect(res.status).toBe(201);
    expect(metadataService.scheduleMetadataFetch).toHaveBeenCalledWith(
      expect.anything(),
      { shortCode: "aB3xY9", longUrl: "https://example.com/page" },
    );
  });

  it("does not schedule a metadata fetch when validation fails", async () => {
    await request(app)
      .post("/api/shorten")
      .set("Authorization", authHeader())
      .send({ longUrl: "nope" });

    expect(metadataService.scheduleMetadataFetch).not.toHaveBeenCalled();
  });

  it("returns 401 without a token", async () => {
    const res = await request(app)
      .post("/api/shorten")
      .send({ longUrl: "https://example.com" });

    expect(res.status).toBe(401);
    expect(Url.create).not.toHaveBeenCalled();
  });

  it("stores the authenticated user as owner", async () => {
    shortenService.getNextShortCode.mockResolvedValue("aB3xY9");
    Url.create.mockResolvedValue({ shortCode: "aB3xY9" });

    await request(app)
      .post("/api/shorten")
      .set("Authorization", authHeader("507f1f77bcf86cd799439011"))
      .send({ longUrl: "https://example.com" });

    expect(Url.create).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "507f1f77bcf86cd799439011" }),
    );
  });

  it("creates a short URL for a valid longUrl and returns 201", async () => {
    shortenService.getNextShortCode.mockResolvedValue("aB3xY9");
    Url.create.mockResolvedValue({
      shortCode: "aB3xY9",
      longUrl: "https://example.com/some/long/path",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
    });

    const res = await request(app)
      .post("/api/shorten")
      .set("Authorization", authHeader())
      .send({ longUrl: "https://example.com/some/long/path" });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      shortCode: "aB3xY9",
      shortUrl: expect.stringContaining("/aB3xY9"),
      longUrl: "https://example.com/some/long/path",
    });
    expect(Url.create).toHaveBeenCalledWith(
      expect.objectContaining({
        shortCode: "aB3xY9",
        longUrl: "https://example.com/some/long/path",
      }),
    );
  });

  it("returns 400 and does not call the service when longUrl is not a valid URL", async () => {
    const res = await request(app)
      .post("/api/shorten")
      .set("Authorization", authHeader())
      .send({ longUrl: "not-a-url" });

    expect(res.status).toBe(400);
    expect(shortenService.getNextShortCode).not.toHaveBeenCalled();
    expect(Url.create).not.toHaveBeenCalled();
  });

  it("returns 409 and does not create a URL when the custom alias is already taken", async () => {
    Url.findOne.mockResolvedValue({ customAlias: "my-link" });

    const res = await request(app)
      .post("/api/shorten")
      .set("Authorization", authHeader())
      .send({ longUrl: "https://example.com", customAlias: "my-link" });

    expect(res.status).toBe(409);
    expect(Url.findOne).toHaveBeenCalledWith({
      $or: [{ customAlias: "my-link" }, { shortCode: "my-link" }],
    });
    expect(shortenService.getNextShortCode).not.toHaveBeenCalled();
    expect(Url.create).not.toHaveBeenCalled();
  });

  it("creates a short URL with a free custom alias", async () => {
    Url.findOne.mockResolvedValue(null);
    shortenService.getNextShortCode.mockResolvedValue("aB3xY9");
    Url.create.mockResolvedValue({
      shortCode: "aB3xY9",
      longUrl: "https://example.com",
      customAlias: "my-link",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
    });

    const res = await request(app)
      .post("/api/shorten")
      .set("Authorization", authHeader())
      .send({ longUrl: "https://example.com", customAlias: "my-link" });

    expect(res.status).toBe(201);
    expect(Url.create).toHaveBeenCalledWith(
      expect.objectContaining({ customAlias: "my-link" }),
    );
  });

  it.each(["health", "api", "api-docs"])(
    "rejects the reserved alias %s with 400",
    async (customAlias) => {
      const res = await request(app)
        .post("/api/shorten")
        .set("Authorization", authHeader())
        .send({ longUrl: "https://example.com", customAlias });

      expect(res.status).toBe(400);
      expect(Url.create).not.toHaveBeenCalled();
    },
  );

  it("returns 409 when a concurrent request wins the alias (duplicate key)", async () => {
    Url.findOne.mockResolvedValue(null);
    shortenService.getNextShortCode.mockResolvedValue("aB3xY9");
    Url.create.mockRejectedValue(
      Object.assign(new Error("E11000 duplicate key"), { code: 11000 }),
    );

    const res = await request(app)
      .post("/api/shorten")
      .set("Authorization", authHeader())
      .send({ longUrl: "https://example.com", customAlias: "my-link" });

    expect(res.status).toBe(409);
    expect(res.body).toEqual({ error: "Custom alias already in use" });
  });

  it("increments the owner's totalLinks", async () => {
    shortenService.getNextShortCode.mockResolvedValue("aB3xY9");
    Url.create.mockResolvedValue({ shortCode: "aB3xY9" });

    await request(app)
      .post("/api/shorten")
      .set("Authorization", authHeader("507f1f77bcf86cd799439011"))
      .send({ longUrl: "https://example.com" });

    expect(User.updateOne).toHaveBeenCalledWith(
      { _id: "507f1f77bcf86cd799439011" },
      { $inc: { totalLinks: 1 } },
    );
  });

  it("still returns 201 when the totalLinks update fails", async () => {
    shortenService.getNextShortCode.mockResolvedValue("aB3xY9");
    Url.create.mockResolvedValue({ shortCode: "aB3xY9" });
    User.updateOne.mockRejectedValue(new Error("mongo blip"));

    const res = await request(app)
      .post("/api/shorten")
      .set("Authorization", authHeader())
      .send({ longUrl: "https://example.com" });

    expect(res.status).toBe(201);
  });
});
