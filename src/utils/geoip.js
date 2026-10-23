const geoip = require("geoip-lite");

function countryForIp(ip) {
  if (!ip) return undefined;
  return geoip.lookup(ip)?.country || undefined;
}

module.exports = { countryForIp };
