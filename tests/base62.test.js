const { encode, decode } = require("../src/utils/base62");

describe("base62.encode", () => {
  it('encodes 0 as "0"', () => {
    expect(encode(0)).toBe("0");
  });

  it("encodes single-digit values using the alphabet directly", () => {
    expect(encode(9)).toBe("9");
    expect(encode(10)).toBe("a");
    expect(encode(35)).toBe("z");
    expect(encode(36)).toBe("A");
    expect(encode(61)).toBe("Z");
  });

  it("rolls over into a second digit at 62", () => {
    expect(encode(62)).toBe("10");
    expect(encode(63)).toBe("11");
  });

  it("rejects negative numbers", () => {
    expect(() => encode(-1)).toThrow();
  });
});

describe("base62.decode", () => {
  it('decodes "0" as 0', () => {
    expect(decode("0")).toBe(0);
  });

  it('decodes "10" as 62', () => {
    expect(decode("10")).toBe(62);
  });

  it("rejects characters outside the base62 alphabet", () => {
    expect(() => decode("!!!")).toThrow();
  });
});

describe("base62 round-trip", () => {
  it("decodes back to the original number for a range of values", () => {
    const samples = [
      0,
      1,
      61,
      62,
      12345,
      916132832,
      56800235583,
      Number.MAX_SAFE_INTEGER,
    ];
    for (const n of samples) {
      expect(decode(encode(n))).toBe(n);
    }
  });
});
