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
      isActive: true,
      $or: [{ shortCode: "aB3xY9" }, { customAlias: "aB3xY9" }],
    });
    // clickCount is incremented by the analytics worker, not on the hot path.
    expect(Url.findOneAndUpdate).not.toHaveBeenCalled();
    expect(redisClient.setCache).toHaveBeenCalledWith(
      "shortcode:aB3xY9",
      JSON.stringify({
        shortCode: "aB3xY9",
        longUrl: "https://example.com/from-db",
      }),
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
      isActive: false,
      $or: [{ shortCode: "gone123" }, { customAlias: "gone123" }],
    });
    expect(redisClient.setCache).not.toHaveBeenCalled();
    expect(analytics.recordClick).not.toHaveBeenCalled();
  });

  it("serves a custom alias and records the click against the canonical short code", async () => {
    redisClient.getCache.mockResolvedValue(null);
    Url.findOne.mockResolvedValue({
      shortCode: "aB3xY9",
      customAlias: "my-link",
      longUrl: "https://example.com/aliased",
    });

    const res = await request(app).get("/my-link");

    expect(res.status).toBe(301);
    expect(res.headers.location).toBe("https://example.com/aliased");
    expect(redisClient.setCache).toHaveBeenCalledWith(
      "shortcode:my-link",
      JSON.stringify({
        shortCode: "aB3xY9",
        longUrl: "https://example.com/aliased",
      }),
      24 * 60 * 60,
    );
    expect(analytics.recordClick).toHaveBeenCalledWith(
      expect.anything(),
      "aB3xY9",
    );
  });

  it("on a cache hit with a stored short code, records the click against that code", async () => {
    redisClient.getCache.mockResolvedValue(
      JSON.stringify({ shortCode: "aB3xY9", longUrl: "https://example.com/a" }),
    );

    const res = await request(app).get("/my-link");

    expect(res.status).toBe(301);
    expect(res.headers.location).toBe("https://example.com/a");
    expect(analytics.recordClick).toHaveBeenCalledWith(
      expect.anything(),
      "aB3xY9",
    );
  });

  it("returns 410 for a link past its expiresAt that the TTL sweep has not removed yet", async () => {
    redisClient.getCache.mockResolvedValue(null);
    Url.findOne.mockResolvedValue({
      shortCode: "old123",
      longUrl: "https://example.com/old",
      expiresAt: new Date(Date.now() - 1000),
    });

    const res = await request(app).get("/old123");

    expect(res.status).toBe(410);
    expect(redisClient.setCache).not.toHaveBeenCalled();
    expect(analytics.recordClick).not.toHaveBeenCalled();
  });

  it("caps the cache TTL at the link's remaining lifetime", async () => {
    redisClient.getCache.mockResolvedValue(null);
    Url.findOne.mockResolvedValue({
      shortCode: "soon12",
      longUrl: "https://example.com/soon",
      expiresAt: new Date(Date.now() + 3600 * 1000),
    });

    await request(app).get("/soon12");

    const ttl = redisClient.setCache.mock.calls[0][2];
    expect(ttl).toBeGreaterThan(3590);
    expect(ttl).toBeLessThanOrEqual(3600);
  });
});
