jest.mock("../src/models/url.model");
jest.mock("../src/models/analytics.model");

const request = require("supertest");
const Url = require("../src/models/url.model");
const Analytics = require("../src/models/analytics.model");
const app = require("../src/app");
const { authHeader } = require("./helpers");

const USER_ID = "507f1f77bcf86cd799439011";

function mockOwnedUrl(url) {
  const chain = {
    read: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(url),
  };
  Url.findOne.mockReturnValue(chain);
  return chain;
}

function mockAggregate(result) {
  const chain = { read: jest.fn().mockResolvedValue(result) };
  Analytics.aggregate.mockReturnValue(chain);
  return chain;
}

describe("GET /api/analytics/:code", () => {
  beforeEach(() => jest.resetAllMocks());

  const get = (path = "/api/analytics/aB3xY9") =>
    request(app).get(path).set("Authorization", authHeader(USER_ID));

  it("requires authentication", async () => {
    const res = await request(app).get("/api/analytics/aB3xY9");
    expect(res.status).toBe(401);
  });

  it("returns 404 when the link is missing or owned by someone else", async () => {
    mockOwnedUrl(null);

    const res = await get();

    expect(res.status).toBe(404);
    expect(Url.findOne).toHaveBeenCalledWith({
      shortCode: "aB3xY9",
      userId: USER_ID,
    });
    expect(Analytics.aggregate).not.toHaveBeenCalled();
  });

  it("returns click totals grouped by country, referrer and date, read from a secondary", async () => {
    mockOwnedUrl({ shortCode: "aB3xY9" });
    const agg = mockAggregate([
      {
        total: [{ n: 3 }],
        byCountry: [
          { _id: "US", clicks: 2 },
          { _id: "IN", clicks: 1 },
        ],
        byReferrer: [
          { _id: "direct", clicks: 2 },
          { _id: "https://t.co/x", clicks: 1 },
        ],
        byDate: [
          { _id: "2026-10-18", clicks: 1 },
          { _id: "2026-10-19", clicks: 2 },
        ],
      },
    ]);

    const res = await get("/api/analytics/aB3xY9?days=7");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      shortCode: "aB3xY9",
      days: 7,
      totalClicks: 3,
      byCountry: [
        { country: "US", clicks: 2 },
        { country: "IN", clicks: 1 },
      ],
      byReferrer: [
        { referrer: "direct", clicks: 2 },
        { referrer: "https://t.co/x", clicks: 1 },
      ],
      byDate: [
        { date: "2026-10-18", clicks: 1 },
        { date: "2026-10-19", clicks: 2 },
      ],
    });
    expect(agg.read).toHaveBeenCalledWith("secondary");
    const [{ $match }] = Analytics.aggregate.mock.calls[0][0];
    expect($match.shortCode).toBe("aB3xY9");
    const sinceMs = Date.now() - $match.timestamp.$gte.getTime();
    expect(Math.abs(sinceMs - 7 * 24 * 3600 * 1000)).toBeLessThan(5000);
  });

  it("returns zeros and empty lists when there are no clicks", async () => {
    mockOwnedUrl({ shortCode: "aB3xY9" });
    mockAggregate([{ total: [], byCountry: [], byReferrer: [], byDate: [] }]);

    const res = await get();

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      days: 30,
      totalClicks: 0,
      byCountry: [],
      byReferrer: [],
      byDate: [],
    });
  });

  it.each(["0", "31", "abc", "-1", "1.5"])(
    "rejects days=%s with 400",
    async (days) => {
      const res = await get(`/api/analytics/aB3xY9?days=${days}`);
      expect(res.status).toBe(400);
      expect(Url.findOne).not.toHaveBeenCalled();
    },
  );
});
