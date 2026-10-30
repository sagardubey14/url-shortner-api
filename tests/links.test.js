jest.mock("../src/models/url.model");
jest.mock("../src/models/user.model");
jest.mock("../src/config/redis");

const request = require("supertest");
const Url = require("../src/models/url.model");
const User = require("../src/models/user.model");
const redisClient = require("../src/config/redis");
const app = require("../src/app");
const { authHeader } = require("./helpers");

const USER_ID = "507f1f77bcf86cd799439011";

describe("auth middleware", () => {
  beforeEach(() => jest.resetAllMocks());

  it("rejects requests without a token with 401", async () => {
    const res = await request(app).get("/api/links");
    expect(res.status).toBe(401);
  });

  it("rejects an invalid token with 401", async () => {
    const res = await request(app)
      .get("/api/links")
      .set("Authorization", "Bearer garbage");
    expect(res.status).toBe(401);
  });
});

describe("GET /api/links", () => {
  beforeEach(() => jest.resetAllMocks());

  function mockList(docs, total) {
    const chain = {
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      read: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue(docs),
    };
    Url.find.mockReturnValue(chain);
    Url.countDocuments.mockReturnValue({
      read: jest.fn().mockResolvedValue(total),
    });
    return chain;
  }

  it("lists only the caller's active links, newest first, from a secondary", async () => {
    const chain = mockList([{ shortCode: "aB3xY9" }], 1);

    const res = await request(app)
      .get("/api/links?page=2&limit=5")
      .set("Authorization", authHeader(USER_ID));

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      links: [{ shortCode: "aB3xY9" }],
      page: 2,
      limit: 5,
      total: 1,
    });
    expect(Url.find).toHaveBeenCalledWith({ userId: USER_ID, isActive: true });
    expect(chain.sort).toHaveBeenCalledWith({ createdAt: -1 });
    expect(chain.skip).toHaveBeenCalledWith(5);
    expect(chain.limit).toHaveBeenCalledWith(5);
    expect(chain.read).toHaveBeenCalledWith("secondary");
  });
});

describe("DELETE /api/links/:code", () => {
  beforeEach(() => jest.resetAllMocks());

  it("soft-deletes the caller's link and evicts it from the cache", async () => {
    Url.findOneAndUpdate.mockResolvedValue({ shortCode: "aB3xY9" });

    const res = await request(app)
      .delete("/api/links/aB3xY9")
      .set("Authorization", authHeader(USER_ID));

    expect(res.status).toBe(204);
    expect(Url.findOneAndUpdate).toHaveBeenCalledWith(
      { shortCode: "aB3xY9", userId: USER_ID, isActive: true },
      { isActive: false },
    );
    expect(redisClient.delCache).toHaveBeenCalledWith("shortcode:aB3xY9");
  });

  it("also evicts the custom alias from the cache and decrements totalLinks", async () => {
    Url.findOneAndUpdate.mockResolvedValue({
      shortCode: "aB3xY9",
      customAlias: "my-link",
    });

    await request(app)
      .delete("/api/links/aB3xY9")
      .set("Authorization", authHeader(USER_ID));

    expect(redisClient.delCache).toHaveBeenCalledWith("shortcode:aB3xY9");
    expect(redisClient.delCache).toHaveBeenCalledWith("shortcode:my-link");
    expect(User.updateOne).toHaveBeenCalledWith(
      { _id: USER_ID },
      { $inc: { totalLinks: -1 } },
    );
  });

  it("returns 404 when the link is missing or owned by someone else", async () => {
    Url.findOneAndUpdate.mockResolvedValue(null);

    const res = await request(app)
      .delete("/api/links/aB3xY9")
      .set("Authorization", authHeader(USER_ID));

    expect(res.status).toBe(404);
    expect(redisClient.delCache).not.toHaveBeenCalled();
  });
});
