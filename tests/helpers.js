const jwt = require("jsonwebtoken");

const authHeader = (userId = "507f1f77bcf86cd799439011") =>
  `Bearer ${jwt.sign({ sub: userId }, process.env.JWT_SECRET)}`;

module.exports = { authHeader };
