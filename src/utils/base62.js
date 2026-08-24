const ALPHABET =
  "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
const BASE = ALPHABET.length;
const CHAR_INDEX = new Map([...ALPHABET].map((char, i) => [char, i]));

function encode(number) {
  if (!Number.isInteger(number) || number < 0) {
    throw new Error(
      `base62.encode expects a non-negative integer, got: ${number}`,
    );
  }

  if (number === 0) {
    return ALPHABET[0];
  }

  let remaining = number;
  let result = "";
  while (remaining > 0) {
    result = ALPHABET[remaining % BASE] + result;
    remaining = Math.floor(remaining / BASE);
  }
  return result;
}

function decode(code) {
  let result = 0;
  for (const char of code) {
    const digit = CHAR_INDEX.get(char);
    if (digit === undefined) {
      throw new Error(
        `base62.decode encountered a character outside the alphabet: ${char}`,
      );
    }
    result = result * BASE + digit;
  }
  return result;
}

module.exports = { encode, decode };
