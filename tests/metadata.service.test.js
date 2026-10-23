jest.mock("../src/config/queue");

const queue = require("../src/config/queue");
const { scheduleMetadataFetch } = require("../src/services/metadata.service");

const fakeReq = () => ({ log: { warn: jest.fn() } });
const link = { shortCode: "aB3xY9", longUrl: "https://example.com" };

describe("scheduleMetadataFetch", () => {
  beforeEach(() => jest.resetAllMocks());

  it("enqueues a metadata job for the link", () => {
    queue.enqueueMetadata.mockResolvedValue();

    scheduleMetadataFetch(fakeReq(), link);

    expect(queue.enqueueMetadata).toHaveBeenCalledWith(link);
  });

  it("never throws or rejects when the queue is down", async () => {
    queue.enqueueMetadata.mockRejectedValue(new Error("redis down"));
    const req = fakeReq();

    expect(() => scheduleMetadataFetch(req, link)).not.toThrow();
    await new Promise(setImmediate);

    expect(req.log.warn).toHaveBeenCalled();
  });

  it("never throws when enqueueMetadata throws synchronously", () => {
    queue.enqueueMetadata.mockImplementation(() => {
      throw new Error("boom");
    });

    expect(() => scheduleMetadataFetch(fakeReq(), link)).not.toThrow();
  });
});
