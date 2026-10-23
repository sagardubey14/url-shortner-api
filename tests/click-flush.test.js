jest.mock("../src/models/analytics.model");
jest.mock("../src/models/url.model");
jest.mock("../src/utils/geoip");

const Analytics = require("../src/models/analytics.model");
const Url = require("../src/models/url.model");
const { countryForIp } = require("../src/utils/geoip");
const { flushClicks } = require("../src/services/click-flush.service");

const click = (shortCode, extra = {}) => ({
  shortCode,
  ipAddress: "203.0.113.9",
  referrer: "https://t.co/x",
  userAgent: "jest-agent",
  timestamp: "2026-10-19T10:00:00.000Z",
  ...extra,
});

describe("flushClicks", () => {
  beforeEach(() => jest.resetAllMocks());

  it("bulk-inserts one analytics document per click", async () => {
    await flushClicks([click("aaa"), click("bbb", { referrer: undefined })]);

    expect(Analytics.insertMany).toHaveBeenCalledTimes(1);
    const [docs, options] = Analytics.insertMany.mock.calls[0];
    expect(docs).toEqual([
      {
        shortCode: "aaa",
        ipAddress: "203.0.113.9",
        referrer: "https://t.co/x",
        userAgent: "jest-agent",
        timestamp: new Date("2026-10-19T10:00:00.000Z"),
      },
      expect.objectContaining({ shortCode: "bbb" }),
    ]);
    expect(options).toEqual({ ordered: false });
  });

  it("stores the country resolved from each click's IP", async () => {
    countryForIp.mockImplementation((ip) => (ip === "1.1.1.1" ? "AU" : "US"));

    await flushClicks([click("aaa"), click("bbb", { ipAddress: "1.1.1.1" })]);

    const docs = Analytics.insertMany.mock.calls[0][0];
    expect(docs.map((d) => d.country)).toEqual(["US", "AU"]);
    expect(countryForIp).toHaveBeenCalledWith("1.1.1.1");
  });

  it("increments clickCount once per short code with the summed count", async () => {
    await flushClicks([click("aaa"), click("bbb"), click("aaa"), click("aaa")]);

    expect(Url.bulkWrite).toHaveBeenCalledWith([
      {
        updateOne: {
          filter: { shortCode: "aaa" },
          update: { $inc: { clickCount: 3 } },
        },
      },
      {
        updateOne: {
          filter: { shortCode: "bbb" },
          update: { $inc: { clickCount: 1 } },
        },
      },
    ]);
  });

  it("propagates a database failure so the jobs are retried", async () => {
    Analytics.insertMany.mockRejectedValue(new Error("mongo down"));

    await expect(flushClicks([click("aaa")])).rejects.toThrow("mongo down");
    expect(Url.bulkWrite).not.toHaveBeenCalled();
  });
});
