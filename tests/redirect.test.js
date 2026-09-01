jest.mock("../src/models/url.model");
jest.mock("../src/config/redis");

const request = require("supertest");
const Url = require("../src/models/url.model");
const redisClient = require("../src/config/redis");
const app = require("../src/app");

describe("GET /:code", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("redirects immediately on a cache hit, without touching the DB", async () => {
    redisClient.getCache.mockResolvedValue("https://example.com/cached");

    const res = await request(app).get("/aB3xY9");

    expect(res.status).toBe(301);
    expect(res.headers.location).toBe("https://example.com/cached");
    expect(Url.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it("on a cache miss, looks up the URL, increments clickCount, populates the cache, and redirects", async () => {
    redisClient.getCache.mockResolvedValue(null);
    Url.findOneAndUpdate.mockResolvedValue({
      shortCode: "aB3xY9",
      longUrl: "https://example.com/from-db",
      isActive: true,
    });

    const res = await request(app).get("/aB3xY9");

    expect(res.status).toBe(301);
    expect(res.headers.location).toBe("https://example.com/from-db");
    expect(Url.findOneAndUpdate).toHaveBeenCalledWith(
      { shortCode: "aB3xY9", isActive: true },
      { $inc: { clickCount: 1 } },
      { new: true },
    );
    expect(redisClient.setCache).toHaveBeenCalledWith(
      "shortcode:aB3xY9",
      "https://example.com/from-db",
      24 * 60 * 60,
    );
  });

  it("returns 404 for a code that does not exist at all", async () => {
    redisClient.getCache.mockResolvedValue(null);
    Url.findOneAndUpdate.mockResolvedValue(null);
    Url.findOne.mockResolvedValue(null);

    const res = await request(app).get("/doesNotExist");

    expect(res.status).toBe(404);
    expect(redisClient.setCache).not.toHaveBeenCalled();
  });

  it("returns 410 for a code that exists but was soft-deleted", async () => {
    redisClient.getCache.mockResolvedValue(null);
    Url.findOneAndUpdate.mockResolvedValue(null);
    Url.findOne.mockResolvedValue({ shortCode: "gone123", isActive: false });

    const res = await request(app).get("/gone123");

    expect(res.status).toBe(410);
    expect(Url.findOne).toHaveBeenCalledWith({
      shortCode: "gone123",
      isActive: false,
    });
    expect(redisClient.setCache).not.toHaveBeenCalled();
  });
});
