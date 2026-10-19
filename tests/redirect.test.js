jest.mock("../src/models/url.model");
jest.mock("../src/config/redis");
jest.mock("../src/services/analytics.service");

const request = require("supertest");
const Url = require("../src/models/url.model");
const redisClient = require("../src/config/redis");
const analytics = require("../src/services/analytics.service");
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
    expect(Url.findOne).not.toHaveBeenCalled();
    expect(Url.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it("records a click on a cache hit", async () => {
    redisClient.getCache.mockResolvedValue("https://example.com/cached");

    await request(app).get("/aB3xY9").set("Referer", "https://t.co/x");

    expect(analytics.recordClick).toHaveBeenCalledTimes(1);
    expect(analytics.recordClick).toHaveBeenCalledWith(
      expect.objectContaining({
        get: expect.any(Function),
        ip: expect.any(String),
      }),
      "aB3xY9",
    );
  });

  it("on a cache miss, looks up the URL, populates the cache, records a click, and redirects", async () => {
    redisClient.getCache.mockResolvedValue(null);
    Url.findOne.mockResolvedValue({
      shortCode: "aB3xY9",
      longUrl: "https://example.com/from-db",
      isActive: true,
    });

    const res = await request(app).get("/aB3xY9");

    expect(res.status).toBe(301);
    expect(res.headers.location).toBe("https://example.com/from-db");
    expect(Url.findOne).toHaveBeenCalledWith({
      shortCode: "aB3xY9",
      isActive: true,
    });
    // clickCount is incremented by the analytics worker, not on the hot path.
    expect(Url.findOneAndUpdate).not.toHaveBeenCalled();
    expect(redisClient.setCache).toHaveBeenCalledWith(
      "shortcode:aB3xY9",
      "https://example.com/from-db",
      24 * 60 * 60,
    );
    expect(analytics.recordClick).toHaveBeenCalledWith(
      expect.anything(),
      "aB3xY9",
    );
  });

  it("returns 404 for a code that does not exist at all", async () => {
    redisClient.getCache.mockResolvedValue(null);
    Url.findOne.mockResolvedValue(null);

    const res = await request(app).get("/doesNotExist");

    expect(res.status).toBe(404);
    expect(redisClient.setCache).not.toHaveBeenCalled();
    expect(analytics.recordClick).not.toHaveBeenCalled();
  });

  it("returns 410 for a code that exists but was soft-deleted", async () => {
    redisClient.getCache.mockResolvedValue(null);
    Url.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ shortCode: "gone123", isActive: false });

    const res = await request(app).get("/gone123");

    expect(res.status).toBe(410);
    expect(Url.findOne).toHaveBeenLastCalledWith({
      shortCode: "gone123",
      isActive: false,
    });
    expect(redisClient.setCache).not.toHaveBeenCalled();
    expect(analytics.recordClick).not.toHaveBeenCalled();
  });
});
