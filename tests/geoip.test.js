const { countryForIp } = require("../src/utils/geoip");

describe("countryForIp", () => {
  it("resolves a public IPv4 address to its country code", () => {
    expect(countryForIp("8.8.8.8")).toBe("US");
  });

  it("resolves an IPv4-mapped IPv6 address", () => {
    expect(countryForIp("::ffff:8.8.8.8")).toBe("US");
  });

  it.each([
    ["private address", "10.0.0.1"],
    ["garbage", "not-an-ip"],
    ["undefined", undefined],
  ])("returns undefined for %s", (_name, ip) => {
    expect(countryForIp(ip)).toBeUndefined();
  });
});
