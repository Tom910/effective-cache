import { Bench } from "tinybench";
import { S3FifoCache } from "../src/s3-fifo/index";
import { LRUCache } from "lru-cache";
import QuickLRU from 'quick-lru';
import { lru } from 'tiny-lru';

const bench = new Bench({ time: 5000 });

bench
  .add("lru-cache", () => {
    const cache = new LRUCache<string, string>({ max: 1000 });

    for (let i = 0; i < 1000; i++) {
      cache.set(`key{i}`, `value{i}`);
      cache.get(`key{i}`);
      cache.get(`key{i}`);
    }

    for (let i = 0; i < 1000; i++) {
      cache.get(`key{i}`);
    }
  })
  .add("tiny-lru", () => {
    const cache = lru(1000);

    for (let i = 0; i < 1000; i++) {
      cache.set(`key{i}`, `value{i}`);
      cache.get(`key{i}`);
      cache.get(`key{i}`);
    }

    for (let i = 0; i < 1000; i++) {
      cache.get(`key{i}`);
    }
  })
  .add("quick-lru", () => {
    const cache = new QuickLRU({ maxSize: 1000 });

    for (let i = 0; i < 1000; i++) {
      cache.set(`key{i}`, `value{i}`);
      cache.get(`key{i}`);
      cache.get(`key{i}`);
    }

    for (let i = 0; i < 1000; i++) {
      cache.get(`key{i}`);
    }
  })
  .add("s3-fifo", () => {
    const cache = new S3FifoCache(1000);

    for (let i = 0; i < 1000; i++) {
      cache.set(`key{i}`, `value{i}`);
      cache.get(`key{i}`);
      cache.get(`key{i}`);
    }

    for (let i = 0; i < 1000; i++) {
      cache.get(`key{i}`);
    }
  })

async function run() {
  await bench.warmup();
  await bench.run();
  console.log(bench.results.map((r: any) => r.error));
  console.table(bench.table());
}
run();
