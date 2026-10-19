jest.mock("../src/models/url.model");
jest.mock("../src/services/shorten.service");

const request = require("supertest");
const Url = require("../src/models/url.model");
const shortenService = require("../src/services/shorten.service");
const app = require("../src/app");
const { authHeader } = require("./helpers");

describe("rate limiting on POST /api/shorten", () => {
  it("allows 10 requests per minute per IP, then returns 429", async () => {
    shortenService.getNextShortCode.mockResolvedValue("aB3xY9");
    Url.create.mockResolvedValue({ shortCode: "aB3xY9" });

    const send = () =>
      request(app)
        .post("/api/shorten")
        .set("Authorization", authHeader())
        .send({ longUrl: "https://example.com" });

    for (let i = 0; i < 10; i++) {
      expect((await send()).status).toBe(201);
    }
    const res = await send();

    expect(res.status).toBe(429);
    expect(res.body).toEqual({ error: "Too many requests" });
    expect(res.headers["retry-after"]).toBeDefined();
  });
});
