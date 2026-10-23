const { isPrivateIp } = require("../src/utils/ip-guard");

describe("isPrivateIp", () => {
  it.each([
    "127.0.0.1",
    "10.1.2.3",
    "172.16.0.1",
    "172.31.255.255",
    "192.168.1.1",
    "169.254.169.254",
    "0.0.0.0",
    "100.64.0.1",
    "::1",
    "::",
    "fe80::1",
    "fc00::1",
    "fd12:3456::1",
    "::ffff:127.0.0.1",
    "::ffff:10.0.0.1",
  ])("treats %s as private", (ip) => {
    expect(isPrivateIp(ip)).toBe(true);
  });

  it.each([
    "8.8.8.8",
    "1.1.1.1",
    "172.32.0.1",
    "100.128.0.1",
    "2606:4700:4700::1111",
    "::ffff:8.8.8.8",
  ])("treats %s as public", (ip) => {
    expect(isPrivateIp(ip)).toBe(false);
  });

  it("treats anything that is not an IP as private (fail closed)", () => {
    expect(isPrivateIp("not-an-ip")).toBe(true);
  });
});
