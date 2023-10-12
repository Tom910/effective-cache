# Cache


## Key Benefits:

- 
## How to Install

```bash
npm install --save effective-cache
```

## How to Use

### s3-fifo cache example

Based on [this paper](https://blog.jasony.me/system/cache/2023/08/01/s3fifo)

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


## Features


### 


## TODO
