jest.mock("../src/models/url.model");
jest.mock("../src/config/redis");

const request = require("supertest");
const Url = require("../src/models/url.model");
const redisClient = require("../src/config/redis");
const app = require("../src/app");
const { authHeader } = require("./helpers");

describe("POST /api/shorten validation", () => {
  beforeEach(() => jest.resetAllMocks());

  const post = (body) =>
    request(app)
      .post("/api/shorten")
      .set("Authorization", authHeader())
      .send(body);

  it.each([
    ["javascript: scheme", "javascript:alert(1)"],
    ["ftp: scheme", "ftp://example.com/file"],
    ["over-long URL", `https://example.com/${"a".repeat(2100)}`],
  ])("rejects %s with 400", async (_name, longUrl) => {
    const res = await post({ longUrl });
    expect(res.status).toBe(400);
    expect(Url.create).not.toHaveBeenCalled();
  });

  it("rejects empty tags with 400", async () => {
    const res = await post({ longUrl: "https://example.com", tags: [" "] });
    expect(res.status).toBe(400);
  });
});

describe("GET /:code with a malformed code", () => {
  beforeEach(() => jest.resetAllMocks());

  it("returns 404 without touching Redis or the DB", async () => {
    const res = await request(app).get("/favicon.ico");

    expect(res.status).toBe(404);
    expect(redisClient.getCache).not.toHaveBeenCalled();
    expect(Url.findOneAndUpdate).not.toHaveBeenCalled();
  });
});

describe("error responses", () => {
  beforeEach(() => jest.resetAllMocks());

  it("returns 400 { error } for malformed JSON", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .set("Content-Type", "application/json")
      .send("{bad");

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "Invalid JSON body" });
  });

  it("hides internal error details on a 500", async () => {
    redisClient.getCache.mockRejectedValue(
      new Error("redis exploded at 10.0.0.5"),
    );

    const res = await request(app).get("/aB3xY9");

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: "Internal server error" });
  });
});
