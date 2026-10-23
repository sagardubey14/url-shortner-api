const { UnrecoverableError } = require("bullmq");
const Url = require("../models/url.model");
const { PermanentFetchError, createFetcher } = require("./metadata-fetcher");
const { parseMetadata } = require("../utils/og-parser");

const defaultFetchPage = createFetcher();

async function processMetadataJob(
  { shortCode, longUrl },
  { fetchPage = defaultFetchPage } = {},
) {
  let page;
  try {
    page = await fetchPage(longUrl);
  } catch (err) {
    // Retrying a 404, a blocked host or a non-HTML page cannot succeed.
    if (err instanceof PermanentFetchError) {
      throw new UnrecoverableError(err.message);
    }
    throw err;
  }

  const metadata = parseMetadata(page.html, page.finalUrl);
  if (Object.keys(metadata).length === 0) return;

  await Url.updateOne({ shortCode }, { $set: { metadata } });
}

module.exports = { processMetadataJob };
