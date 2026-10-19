const { ClickBatcher } = require("../src/services/click-batcher");

describe("ClickBatcher", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it("flushes everything buffered after the interval elapses", async () => {
    const flush = jest.fn().mockResolvedValue();
    const batcher = new ClickBatcher({
      flush,
      maxSize: 1000,
      intervalMs: 5000,
    });

    const a = batcher.add({ n: 1 });
    const b = batcher.add({ n: 2 });
    expect(flush).not.toHaveBeenCalled();

    await jest.advanceTimersByTimeAsync(5000);
    await Promise.all([a, b]);

    expect(flush).toHaveBeenCalledTimes(1);
    expect(flush).toHaveBeenCalledWith([{ n: 1 }, { n: 2 }]);
  });

  it("flushes immediately once maxSize items are buffered", async () => {
    const flush = jest.fn().mockResolvedValue();
    const batcher = new ClickBatcher({ flush, maxSize: 3, intervalMs: 5000 });

    const pending = [1, 2, 3].map((n) => batcher.add({ n }));
    await Promise.all(pending);

    expect(flush).toHaveBeenCalledTimes(1);
    expect(flush).toHaveBeenCalledWith([{ n: 1 }, { n: 2 }, { n: 3 }]);
  });

  it("does not flush twice for the same items when the timer fires after a size flush", async () => {
    const flush = jest.fn().mockResolvedValue();
    const batcher = new ClickBatcher({ flush, maxSize: 2, intervalMs: 5000 });

    await Promise.all([batcher.add({ n: 1 }), batcher.add({ n: 2 })]);
    await jest.advanceTimersByTimeAsync(5000);

    expect(flush).toHaveBeenCalledTimes(1);
  });

  it("rejects every item in a batch when the flush fails, so the jobs can retry", async () => {
    const flush = jest.fn().mockRejectedValue(new Error("mongo down"));
    const batcher = new ClickBatcher({ flush, maxSize: 2, intervalMs: 5000 });

    const results = await Promise.allSettled([
      batcher.add({ n: 1 }),
      batcher.add({ n: 2 }),
    ]);

    expect(results.map((r) => r.status)).toEqual(["rejected", "rejected"]);
  });

  it("starts a fresh batch after a flush", async () => {
    const flush = jest.fn().mockResolvedValue();
    const batcher = new ClickBatcher({ flush, maxSize: 2, intervalMs: 5000 });

    await Promise.all([batcher.add({ n: 1 }), batcher.add({ n: 2 })]);
    const next = batcher.add({ n: 3 });
    await jest.advanceTimersByTimeAsync(5000);
    await next;

    expect(flush).toHaveBeenLastCalledWith([{ n: 3 }]);
  });

  it("flushes remaining items on close()", async () => {
    const flush = jest.fn().mockResolvedValue();
    const batcher = new ClickBatcher({
      flush,
      maxSize: 1000,
      intervalMs: 5000,
    });

    const item = batcher.add({ n: 1 });
    await batcher.close();
    await item;

    expect(flush).toHaveBeenCalledWith([{ n: 1 }]);
  });
});
