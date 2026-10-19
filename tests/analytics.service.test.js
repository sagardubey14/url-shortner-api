jest.mock("../src/config/queue");

const queue = require("../src/config/queue");
const { recordClick } = require("../src/services/analytics.service");

const fakeReq = (headers = {}) => ({
  ip: "203.0.113.9",
  get: (name) => headers[name.toLowerCase()],
  log: { warn: jest.fn() },
});

describe("recordClick", () => {
  beforeEach(() => jest.resetAllMocks());

  it("enqueues the click with request context and a low priority", () => {
    queue.enqueueClick.mockResolvedValue();

    recordClick(
      fakeReq({ referer: "https://t.co/x", "user-agent": "jest-agent" }),
      "aB3xY9",
    );

    expect(queue.enqueueClick).toHaveBeenCalledWith({
      shortCode: "aB3xY9",
      ipAddress: "203.0.113.9",
      referrer: "https://t.co/x",
      userAgent: "jest-agent",
      timestamp: expect.any(String),
    });
  });

  it("never throws or rejects when the queue is down", async () => {
    queue.enqueueClick.mockRejectedValue(new Error("redis down"));
    const req = fakeReq();

    expect(() => recordClick(req, "aB3xY9")).not.toThrow();
    await new Promise(setImmediate);

    expect(req.log.warn).toHaveBeenCalled();
  });

  it("never throws when enqueueClick throws synchronously", () => {
    queue.enqueueClick.mockImplementation(() => {
      throw new Error("boom");
    });

    expect(() => recordClick(fakeReq(), "aB3xY9")).not.toThrow();
  });
});
