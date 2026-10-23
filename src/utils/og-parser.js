const MAX_TITLE = 200;
const MAX_DESCRIPTION = 500;

const ENTITIES = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

function decodeEntities(text) {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, body) => {
    if (body[0] === "#") {
      const code =
        body[1].toLowerCase() === "x"
          ? parseInt(body.slice(2), 16)
          : parseInt(body.slice(1), 10);
      return Number.isInteger(code) && code > 0 && code <= 0x10ffff
        ? String.fromCodePoint(code)
        : match;
    }
    return ENTITIES[body.toLowerCase()] ?? match;
  });
}

function readAttributes(tag) {
  const attrs = {};
  const re = /([a-z:_-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/gi;
  let m;
  while ((m = re.exec(tag))) {
    attrs[m[1].toLowerCase()] = m[2] ?? m[3] ?? m[4];
  }
  return attrs;
}

function collectMeta(html) {
  const meta = {};
  const re = /<meta\b[^>]*>/gi;
  let m;
  while ((m = re.exec(html))) {
    const attrs = readAttributes(m[0]);
    const key = (attrs.property || attrs.name || "").toLowerCase();
    if (key && attrs.content !== undefined && !(key in meta)) {
      meta[key] = decodeEntities(attrs.content).trim();
    }
  }
  return meta;
}

function safeImage(value, pageUrl) {
  try {
    const url = new URL(value, pageUrl);
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.href
      : undefined;
  } catch {
    return undefined;
  }
}

function parseMetadata(html, pageUrl) {
  const meta = collectMeta(html);
  const titleTag = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);

  const result = {
    title: meta["og:title"] || (titleTag && decodeEntities(titleTag[1]).trim()),
    description: meta["og:description"] || meta.description,
    image: meta["og:image"] && safeImage(meta["og:image"], pageUrl),
  };
  if (result.title) result.title = result.title.slice(0, MAX_TITLE);
  if (result.description) {
    result.description = result.description.slice(0, MAX_DESCRIPTION);
  }

  return Object.fromEntries(Object.entries(result).filter(([, v]) => v));
}

module.exports = { parseMetadata };
