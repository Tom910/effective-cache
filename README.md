# Cache
This is a repository for different caching algorithms

## How to Install

```bash
npm install --save effective-cache
```

## How to Use

### S3-FIFO cache example

More information about this algorithm you can find in [this article](https://amarchenko.dev/blog/2023-10-12-memory-cache/)

size: 0.8Kb after gzip

```typescript
import { S3FifoCache } from 'effective-cache';

const cache = new S3FifoCache(100);
cache.set("key", "value");
cache.set("key2", "value");
cache.get("key") // -> "value"

cache.has("key") // -> true

cache.delete("key");
cache.get("key") // -> undefined

cache.clear();
```
