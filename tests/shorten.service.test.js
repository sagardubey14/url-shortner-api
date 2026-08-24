jest.mock("../src/models/counter.model");

const Counter = require("../src/models/counter.model");
const {
  getNextShortCode,
  ensureCounterSeeded,
} = require("../src/services/shorten.service");
const { encode } = require("../src/utils/base62");

describe("getNextShortCode", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("atomically increments the shared counter and base62-encodes the new value", async () => {
    Counter.findOneAndUpdate.mockResolvedValue({
      _id: "url_counter",
      value: 916132833,
    });

    const code = await getNextShortCode();

    expect(Counter.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: "url_counter" },
      { $inc: { value: 1 } },
      { new: true },
    );
    expect(code).toBe(encode(916132833));
  });
});

describe("ensureCounterSeeded", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("seeds the counter document only if it does not already exist", async () => {
    Counter.updateOne.mockResolvedValue({});

    await ensureCounterSeeded();

    expect(Counter.updateOne).toHaveBeenCalledWith(
      { _id: "url_counter" },
      { $setOnInsert: { value: 916132832 } },
      { upsert: true },
    );
  });
});
