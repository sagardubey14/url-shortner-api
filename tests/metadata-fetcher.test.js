const http = require("node:http");
const {
  createFetcher,
  PermanentFetchError,
} = require("../src/services/metadata-fetcher");

let server;
let base;
let handler;

beforeAll(async () => {
  server = http.createServer((req, res) => handler(req, res));
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

afterAll(async () => {
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
});

const allowAll = { isBlockedIp: () => false };
const html = (res, body, status = 200, type = "text/html; charset=utf-8") => {
  res.writeHead(status, { "content-type": type });
  res.end(body);
};

describe("metadata fetcher", () => {
  it("returns the HTML body and final URL", async () => {
    handler = (req, res) => html(res, "<title>Hi</title>");

    const result = await createFetcher(allowAll)(`${base}/page`);

    expect(result).toEqual({
      html: "<title>Hi</title>",
      finalUrl: `${base}/page`,
    });
  });

  it("follows redirects", async () => {
    handler = (req, res) => {
      if (req.url === "/old") {
        res.writeHead(302, { location: "/new" });
        return res.end();
      }
      html(res, "<title>New</title>");
    };

    const result = await createFetcher(allowAll)(`${base}/old`);

    expect(result.html).toBe("<title>New</title>");
    expect(result.finalUrl).toBe(`${base}/new`);
  });

  it("gives up after too many redirects with a permanent error", async () => {
    handler = (req, res) => {
      res.writeHead(302, { location: "/loop" });
      res.end();
    };

    await expect(
      createFetcher({ ...allowAll, maxRedirects: 3 })(`${base}/loop`),
    ).rejects.toBeInstanceOf(PermanentFetchError);
  });

  it("rejects non-HTML content with a permanent error", async () => {
    handler = (req, res) => html(res, "{}", 200, "application/json");

    await expect(createFetcher(allowAll)(`${base}/api`)).rejects.toBeInstanceOf(
      PermanentFetchError,
    );
  });

  it("treats 404 as permanent and 503 as transient", async () => {
    handler = (req, res) => html(res, "nope", 404);
    await expect(createFetcher(allowAll)(`${base}/x`)).rejects.toBeInstanceOf(
      PermanentFetchError,
    );

    handler = (req, res) => html(res, "down", 503);
    const err = await createFetcher(allowAll)(`${base}/x`).catch((e) => e);
    expect(err).toBeInstanceOf(Error);
    expect(err).not.toBeInstanceOf(PermanentFetchError);
  });

  it("stops reading after maxBytes", async () => {
    handler = (req, res) => html(res, "x".repeat(50_000));

    const result = await createFetcher({ ...allowAll, maxBytes: 1000 })(
      `${base}/big`,
    );

    expect(result.html.length).toBeLessThanOrEqual(1000);
  });

  it("times out on a server that never answers (transient error)", async () => {
    handler = () => {};

    const err = await createFetcher({ ...allowAll, timeoutMs: 150 })(
      `${base}/slow`,
    ).catch((e) => e);

    expect(err.name).toBe("AbortError");
    expect(err).not.toBeInstanceOf(PermanentFetchError);
  });

  it("refuses private addresses by default (SSRF guard)", async () => {
    handler = (req, res) => html(res, "secret");

    await expect(createFetcher()(`${base}/`)).rejects.toBeInstanceOf(
      PermanentFetchError,
    );
    await expect(createFetcher()("http://localhost:1/")).rejects.toBeInstanceOf(
      PermanentFetchError,
    );
    await expect(createFetcher()("http://[::1]:1/")).rejects.toBeInstanceOf(
      PermanentFetchError,
    );
  });

  it("refuses a redirect that points at a blocked address", async () => {
    handler = (req, res) => {
      res.writeHead(302, {
        location: "http://169.254.169.254/latest/meta-data",
      });
      res.end();
    };
    const fetchPage = createFetcher({
      isBlockedIp: (ip) => ip === "169.254.169.254",
    });

    await expect(fetchPage(`${base}/redir`)).rejects.toBeInstanceOf(
      PermanentFetchError,
    );
  });

  it("refuses non-http schemes", async () => {
    await expect(
      createFetcher(allowAll)("file:///etc/passwd"),
    ).rejects.toBeInstanceOf(PermanentFetchError);
  });
});
