const Counter = require("../models/counter.model");
const { encode } = require("../utils/base62");

const COUNTER_ID = "url_counter";
// 62^5 — guarantees every generated code is at least 6 characters, matching
// the intended 6-8 char code space instead of drifting through 1-char codes early on.
const COUNTER_START_VALUE = 916132832;

async function ensureCounterSeeded() {
  await Counter.updateOne(
    { _id: COUNTER_ID },
    { $setOnInsert: { value: COUNTER_START_VALUE } },
    { upsert: true },
  );
}

async function getNextShortCode() {
  const counter = await Counter.findOneAndUpdate(
    { _id: COUNTER_ID },
    { $inc: { value: 1 } },
    { new: true },
  );
  return encode(counter.value);
}

module.exports = { ensureCounterSeeded, getNextShortCode };
