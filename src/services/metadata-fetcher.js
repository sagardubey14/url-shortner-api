const dns = require("node:dns");
const http = require("node:http");
const https = require("node:https");
const net = require("node:net");
const { isPrivateIp } = require("../utils/ip-guard");

// Thrown when retrying cannot help (blocked host, 4xx, not HTML, ...).
class PermanentFetchError extends Error {}

const DEFAULTS = {
  timeoutMs: 5000,
  maxBytes: 1_000_000,
  maxRedirects: 3,
  isBlockedIp: isPrivateIp,
};

// These URLs are user-supplied, so the fetcher is an SSRF vector. Every
// connection (including each redirect hop) is checked: literal IPs up front,
// hostnames inside the socket's own DNS lookup so a rebinding resolver can't
// swap in a private address between check and connect.
function guardedLookup(isBlockedIp) {
  return (hostname, options, callback) => {
    dns.lookup(hostname, options, (err, address, family) => {
      if (err) return callback(err);
      const addresses = Array.isArray(address)
        ? address
        : [{ address, family }];
      if (addresses.some((a) => isBlockedIp(a.address))) {
        return callback(
          new PermanentFetchError(`Blocked address for ${hostname}`),
        );
      }
      callback(null, address, family);
    });
  };
}

function requestOnce(url, { timeoutMs, maxBytes, isBlockedIp }) {
  return new Promise((resolve, reject) => {
    const hostname = url.hostname.replace(/^\[|\]$/g, "");
    if (net.isIP(hostname) && isBlockedIp(hostname)) {
      return reject(new PermanentFetchError(`Blocked address ${hostname}`));
    }

    const client = url.protocol === "https:" ? https : http;
    const req = client.request(
      url,
      {
        method: "GET",
        headers: {
          accept: "text/html",
          "user-agent": "url-shortner-metadata-bot/1.0",
        },
        lookup: guardedLookup(isBlockedIp),
        signal: AbortSignal.timeout(timeoutMs),
      },
      (res) => {
        const status = res.statusCode;
        if (status >= 300 && status < 400 && res.headers.location) {
          res.resume();
          return resolve({ redirect: new URL(res.headers.location, url) });
        }
        if (status >= 400 && status < 500 && status !== 429) {
          res.resume();
          return reject(new PermanentFetchError(`HTTP ${status}`));
        }
        if (status !== 200) {
          res.resume();
          return reject(new Error(`HTTP ${status}`));
        }
        if (
          !/^text\/html|^application\/xhtml\+xml/i.test(
            res.headers["content-type"] || "",
          )
        ) {
          res.resume();
          return reject(new PermanentFetchError("Not an HTML page"));
        }

        // OG tags live in <head>, so a truncated body is enough.
        const chunks = [];
        let size = 0;
        res.on("data", (chunk) => {
          chunks.push(chunk);
          size += chunk.length;
          if (size >= maxBytes) res.destroy();
        });
        const done = () =>
          resolve({
            html: Buffer.concat(chunks).toString("utf8").slice(0, maxBytes),
          });
        res.on("end", done);
        res.on("close", () => {
          if (size >= maxBytes) done();
        });
        res.on("error", (err) => {
          if (size < maxBytes) reject(err);
        });
      },
    );
    req.on("error", reject);
    req.end();
  });
}

function createFetcher(overrides = {}) {
  const options = { ...DEFAULTS, ...overrides };

  return async function fetchPage(startUrl) {
    let url;
    try {
      url = new URL(startUrl);
    } catch {
      throw new PermanentFetchError("Invalid URL");
    }

    for (let hop = 0; hop <= options.maxRedirects; hop++) {
      if (url.protocol !== "http:" && url.protocol !== "https:") {
        throw new PermanentFetchError(`Unsupported scheme ${url.protocol}`);
      }
      const result = await requestOnce(url, options);
      if (result.html !== undefined) {
        return { html: result.html, finalUrl: url.href };
      }
      url = result.redirect;
    }
    throw new PermanentFetchError("Too many redirects");
  };
}

module.exports = { createFetcher, PermanentFetchError };
