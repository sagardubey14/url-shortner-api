const { parseMetadata } = require("../src/utils/og-parser");

const page = (head) =>
  `<!doctype html><html><head>${head}</head><body></body></html>`;

describe("parseMetadata", () => {
  it("reads Open Graph title, description and image", () => {
    const html = page(`
      <title>Fallback</title>
      <meta property="og:title" content="OG Title">
      <meta property="og:description" content="OG description">
      <meta property="og:image" content="https://cdn.example.com/a.png">`);

    expect(parseMetadata(html, "https://example.com/post")).toEqual({
      title: "OG Title",
      description: "OG description",
      image: "https://cdn.example.com/a.png",
    });
  });

  it("falls back to <title> and meta description", () => {
    const html = page(`<title> Plain Title </title>
      <meta name="description" content="Plain description">`);

    expect(parseMetadata(html, "https://example.com/")).toEqual({
      title: "Plain Title",
      description: "Plain description",
    });
  });

  it("matches attributes in any order and quote style", () => {
    const html = page(`<meta content='Reordered' property='og:title'>`);
    expect(parseMetadata(html, "https://example.com/").title).toBe("Reordered");
  });

  it("decodes common HTML entities", () => {
    const html = page(
      `<meta property="og:title" content="Tom &amp; Jerry &quot;Live&quot; &#39;24">`,
    );
    expect(parseMetadata(html, "https://example.com/").title).toBe(
      `Tom & Jerry "Live" '24`,
    );
  });

  it("resolves a relative image against the page URL", () => {
    const html = page(`<meta property="og:image" content="/img/cover.jpg">`);
    expect(parseMetadata(html, "https://example.com/post/1").image).toBe(
      "https://example.com/img/cover.jpg",
    );
  });

  it("drops images that are not http(s)", () => {
    const html = page(
      `<meta property="og:image" content="javascript:alert(1)">`,
    );
    expect(parseMetadata(html, "https://example.com/")).toEqual({});
  });

  it("truncates long values", () => {
    const html = page(`<meta property="og:title" content="${"a".repeat(500)}">
      <meta property="og:description" content="${"b".repeat(1000)}">`);
    const meta = parseMetadata(html, "https://example.com/");
    expect(meta.title).toHaveLength(200);
    expect(meta.description).toHaveLength(500);
  });

  it("returns an empty object when nothing is found", () => {
    expect(parseMetadata("<html></html>", "https://example.com/")).toEqual({});
  });
});
