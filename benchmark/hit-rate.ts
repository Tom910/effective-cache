import { createWriteStream, createReadStream } from "node:fs";
import { pipeline } from 'node:stream/promises';
import zlib from "node:zlib";
import fs from "node:fs/promises";
import https from "node:https";
import http from "node:http";
import { S3FifoCache } from "../src/s3-fifo/index";
import { LRUCache } from "lru-cache";
import QuickLRU from 'quick-lru';
import { lru } from 'tiny-lru';


class CSVReader {
  private readonly file: string;
  private readonly delimiter: string;

  constructor(file: string, delimiter: string = ",") {
    this.file = file;
    this.delimiter = delimiter;
  }

  async read(): Promise<string[][]> {
    const file = await fs.readFile(this.file, { encoding: 'utf-8' });
    return file.split("\n").map((line) => line.split(this.delimiter));
  }
}

class TRCReader {
  private readonly file: string;

  constructor(file: string) {
    this.file = file;
  }

  async read(): Promise<string[]> {
    const file = await fs.readFile(this.file, { encoding: 'utf-8' });
    return file.split("\n").filter((line) => line !== '*');
  }
}

async function downloadFile(url: string): Promise<void> {
  const fileName = url.split("/").pop() as string;
  if (await fs.access(`.tmp/${fileName}`).then(() => true).catch(() => false)) {
    return Promise.resolve();
  }

  await fs.mkdir(".tmp", { recursive: true });
  const file = createWriteStream(`.tmp/${fileName}`);
  return new Promise((resolve, reject) => {
    let protocol = https;
    if (url.startsWith("http://")) {
      protocol = http as any;
    }

    protocol.get(url, function (response) {
      response.pipe(file);
    });

    file.on("finish", function () {
      file.close();
      resolve();
    });
  });
}

async function unZipFile(fileName: string, url: string): Promise<void> {
  if (await fs.access(`.tmp/${fileName}`).then(() => true).catch(() => false)) {
    return Promise.resolve();
  }

  const originalFileName = url.split("/").pop() as string;
  await pipeline(
    createReadStream(`.tmp/${originalFileName}`),
    zlib.createUnzip(),
    createWriteStream(`.tmp/${fileName}`)
  );
}

const cacheSize = 1000;

const dataSets = [
  [
    'twitter_cluster52.csv', // 1000002 items
    'https://raw.githubusercontent.com/cacheMon/py-cachemonCache/1bb35ddf89c9f961f12013afb87213f72c75f4b9/data/twitter_cluster52.csv',
    cacheSize,
    CSVReader,
    (data: any) => data.map((v: any) => v[1])
  ],
  [
    'trace.csv', // 113874 items
    'https://raw.githubusercontent.com/1a1a11a/libCacheSim/develop/data/trace.csv',
    cacheSize,
    CSVReader,
    (data: any) => data.map((v: any) => v[4])
  ],
  [
    '2_pools.trc', // 100001 items
    'https://raw.githubusercontent.com/ben-manes/caffeine/master/simulator/src/main/resources/com/github/benmanes/caffeine/cache/simulator/parser/lirs/2_pools.trace.gz',
    cacheSize,
    TRCReader,
    (data: any) => data,
    unZipFile
  ],
  [
    'multi3.trc', // 30242 items
    'https://raw.githubusercontent.com/ben-manes/caffeine/master/simulator/src/main/resources/com/github/benmanes/caffeine/cache/simulator/parser/lirs/multi3.trace.gz',
    cacheSize,
    TRCReader,
    (data: any) => data,
    unZipFile
  ],
  [
    'sprite.trc', // 133997 items
    'https://raw.githubusercontent.com/ben-manes/caffeine/master/simulator/src/main/resources/com/github/benmanes/caffeine/cache/simulator/parser/lirs/sprite.trace.gz',
    cacheSize,
    TRCReader,
    (data: any) => data,
    unZipFile
  ],
  [
    'CAMRESHMSA01-lvm0.csv', // 3993317 items
    'http://dsn.ce.sharif.edu/ftp/IO/Data-Center/hm_0.csv.gz',
    cacheSize,
    CSVReader,
    (data: any) => data.map((v: any) => v[4]),
    unZipFile
  ],
] as const;

async function main() {
  const caches = [
    ["s3-fifo", S3FifoCache, (Inst: any, size: number) => new Inst(size)],
    ["lru-cache", LRUCache, (Inst: any, size: number) => new Inst({ max: size })],
    ["quick-lru", QuickLRU, (Inst: any, size: number) => new Inst({ maxSize: size })],
    ["tiny-lru", lru, (Inst: any, size: number) => new Inst(size)],
  ] as const;

  const agregateInformation = new Map<string, number>();

  for (const [fileName, url, size, readerFactory, postProcess, preProcess = (a: string, b: string) => { }] of dataSets) {
    await downloadFile(url);
    await preProcess(fileName, url);
    const reader = new readerFactory(`.tmp/${fileName}`);
    const dataRaw = await reader.read();
    const data = postProcess(dataRaw);

    console.log(`\ndata set: ${fileName}, size: ${data.length}`);

    for (const [cacheName, cacheInstance, cacheFactory] of caches) {
      const cache = cacheFactory(cacheInstance, size);
      const startTime = performance.now();
      let requests = 0;
      let miss = 0;

      for (const key of data) {
        const value = cache.get(key);
        requests++;

        if (!value) {
          miss++;
          cache.set(key, key);
        }
      }

      const endTime = performance.now();

      if (cacheName === 's3-fifo') {
        console.log(
          cache.mainDequeue.size + cache.smallDequeue.size + cache.ghostDequeue.size >= cache.map.size && size >= cache.mainDequeue.size + cache.smallDequeue.size,
          cache.size, cache.map.size, cache.mainDequeue.size, cache.smallDequeue.size, cache.ghostDequeue.size)
      }

      const hitRate = (requests - miss) / requests * 100;
      const missRatio = miss / requests;

      cache.clear();
      agregateInformation.set(cacheName, (agregateInformation.get(cacheName) || 0) + hitRate);

      console.log(`${cacheName} size: ${size}, miss ratio: ${(missRatio).toFixed(2)} hit rate: ${(hitRate).toFixed(2)}%, throughput ${(requests / (endTime - startTime)).toFixed(2)} req/s`);
    }
    console.log('cache hit rate rate, more better', agregateInformation)
  }
}

main();
