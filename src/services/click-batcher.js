// Buffers items and flushes them together, either when `maxSize` items are
// waiting or `intervalMs` after the first one arrived. add() returns a promise
// that settles with the flush, so a BullMQ job that awaits it stays unacked
// until its click is persisted (and is retried if the flush fails).
class ClickBatcher {
  constructor({ flush, maxSize, intervalMs }) {
    this.flushFn = flush;
    this.maxSize = maxSize;
    this.intervalMs = intervalMs;
    this.items = [];
    this.waiters = [];
    this.timer = null;
  }

  add(item) {
    const promise = new Promise((resolve, reject) => {
      this.items.push(item);
      this.waiters.push({ resolve, reject });
    });

    if (this.items.length >= this.maxSize) {
      this.flush();
    } else if (!this.timer) {
      this.timer = setTimeout(() => this.flush(), this.intervalMs);
    }
    return promise;
  }

  async flush() {
    clearTimeout(this.timer);
    this.timer = null;
    if (this.items.length === 0) return;

    const items = this.items;
    const waiters = this.waiters;
    this.items = [];
    this.waiters = [];

    try {
      await this.flushFn(items);
      waiters.forEach((w) => w.resolve());
    } catch (err) {
      waiters.forEach((w) => w.reject(err));
    }
  }

  close() {
    return this.flush();
  }
}

module.exports = { ClickBatcher };
