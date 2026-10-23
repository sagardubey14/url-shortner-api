const net = require("node:net");

const blocked = new net.BlockList();
[
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["224.0.0.0", 3], // multicast + reserved + broadcast
].forEach(([addr, prefix]) => blocked.addSubnet(addr, prefix, "ipv4"));
[
  ["::", 128],
  ["::1", 128],
  ["fc00::", 7],
  ["fe80::", 10],
  ["ff00::", 8],
].forEach(([addr, prefix]) => blocked.addSubnet(addr, prefix, "ipv6"));

// ::ffff:a.b.c.d or ::ffff:abcd:ef01 -> plain IPv4 so the IPv4 rules apply.
function unmapIpv4(ip) {
  const dotted = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(ip);
  if (dotted) return dotted[1];
  const hex = /^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i.exec(ip);
  if (hex) {
    const hi = parseInt(hex[1], 16);
    const lo = parseInt(hex[2], 16);
    return `${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`;
  }
  return ip;
}

// Fail closed: anything that is not a valid IP counts as private.
function isPrivateIp(ip) {
  const addr = unmapIpv4(String(ip));
  const family = net.isIP(addr);
  if (!family) return true;
  return blocked.check(addr, family === 4 ? "ipv4" : "ipv6");
}

module.exports = { isPrivateIp };
