jest.mock("../src/models/url.model");

const { UnrecoverableError } = require("bullmq");
const Url = require("../src/models/url.model");
const { PermanentFetchError } = require("../src/services/metadata-fetcher");
const { processMetadataJob } = require("../src/services/metadata.processor");

const job = { shortCode: "aB3xY9", longUrl: "https://example.com/post" };

describe("processMetadataJob", () => {
  beforeEach(() => jest.resetAllMocks());

  it("fetches the page and stores parsed metadata on the URL", async () => {
    const fetchPage = jest.fn().mockResolvedValue({
      html: `<meta property="og:title" content="Hello"><meta property="og:image" content="/i.png">`,
      finalUrl: "https://example.com/post",
    });

    await processMetadataJob(job, { fetchPage });

    expect(fetchPage).toHaveBeenCalledWith("https://example.com/post");
    expect(Url.updateOne).toHaveBeenCalledWith(
      { shortCode: "aB3xY9" },
      {
        $set: {
          metadata: { title: "Hello", image: "https://example.com/i.png" },
        },
      },
    );
  });

  it("does not write when the page has no metadata", async () => {
    const fetchPage = jest
      .fn()
      .mockResolvedValue({ html: "<html></html>", finalUrl: job.longUrl });

    await processMetadataJob(job, { fetchPage });

    expect(Url.updateOne).not.toHaveBeenCalled();
  });

  it("turns a permanent fetch failure into an unrecoverable job error (no retries)", async () => {
    const fetchPage = jest
      .fn()
      .mockRejectedValue(new PermanentFetchError("HTTP 404"));

    await expect(processMetadataJob(job, { fetchPage })).rejects.toBeInstanceOf(
      UnrecoverableError,
    );
  });

  it("rethrows transient failures so BullMQ retries the job", async () => {
    const boom = new Error("ECONNRESET");
    const fetchPage = jest.fn().mockRejectedValue(boom);

    const err = await processMetadataJob(job, { fetchPage }).catch((e) => e);

    expect(err).toBe(boom);
    expect(err).not.toBeInstanceOf(UnrecoverableError);
  });
});
