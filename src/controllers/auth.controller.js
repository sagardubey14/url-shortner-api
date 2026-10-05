const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const env = require("../config/env");
const User = require("../models/user.model");
const { credentialsSchema } = require("../validators/auth.validator");

const BCRYPT_ROUNDS = 10;

function parseCredentials(req, res) {
  const parsed = credentialsSchema.safeParse(req.body);
  if (!parsed.success) {
    res
      .status(400)
      .json({ error: "Validation failed", details: parsed.error.flatten() });
    return null;
  }
  return parsed.data;
}

async function register(req, res) {
  const credentials = parseCredentials(req, res);
  if (!credentials) return;
  const email = credentials.email.toLowerCase();

  if (await User.findOne({ email })) {
    return res.status(409).json({ error: "Email already registered" });
  }

  const password = await bcrypt.hash(credentials.password, BCRYPT_ROUNDS);
  const user = await User.create({ email, password });

  res.status(201).json({ id: user._id, email: user.email });
}

async function login(req, res) {
  const credentials = parseCredentials(req, res);
  if (!credentials) return;

  const user = await User.findOne({ email: credentials.email.toLowerCase() });
  const valid =
    user && (await bcrypt.compare(credentials.password, user.password));
  if (!valid) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const token = jwt.sign({ sub: String(user._id) }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  });
  res.json({ token });
}

module.exports = { register, login };
