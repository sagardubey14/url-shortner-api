const mongoose = require("mongoose");
const env = require("./env");

async function connect() {
  await mongoose.connect(env.mongoUri, {
    serverSelectionTimeoutMS: 5000,
  });
}

async function disconnect() {
  await mongoose.disconnect();
}

async function pingPrimary() {
  await mongoose.connection.db.command(
    { ping: 1 },
    { readPreference: "primary" },
  );
}

async function pingSecondary() {
  await mongoose.connection.db.command(
    { ping: 1 },
    { readPreference: "secondary" },
  );
}

module.exports = { connect, disconnect, pingPrimary, pingSecondary };
