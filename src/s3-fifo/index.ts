import { Deque, DequeNode, mainDequeueType, smallDequeueType, ghostDequeueType } from './deque';

export class S3FifoCache<Key = any, Value = any> {
  private map: Map<Key, DequeNode<Key, Value>> = new Map();
  private ghostDequeue = new Deque<Key, Value>();
  private mainDequeue = new Deque<Key, Value>();
  private smallDequeue = new Deque<Key, Value>();
  limitSmall: number;
  limitMain: number;
  limitGhost: number;
  limitSize: number;
  currentSize = 0;

  constructor(limit: number) {
    this.limitSize = limit;
    this.limitGhost = limit; // 100% of limit
    this.limitSmall = Math.floor(limit * 0.1); // 10% of limit
    this.limitMain = limit - this.limitSmall; // 90% of limit
  }

  get(key: Key): Value | undefined {
    const valueNode = this.map.get(key);

    if (valueNode) {
      if (valueNode.type === ghostDequeueType) {
        return undefined;
      }

      valueNode.freq = Math.min(valueNode.freq + 1, 3);

      return valueNode.value as Value;
    }

    return undefined;
  }

  set(key: Key, value: Value): void {
    const valueNode = this.map.get(key);

    if (valueNode) {
      // it was ghost node need to move to main
      if (valueNode.type === ghostDequeueType) {
        this.ghostDequeue.remove(valueNode);
        valueNode.type = mainDequeueType;
        this.mainDequeue.pushFront(valueNode);
        this.currentSize += 1;
      }

      valueNode.value = value;
    } else {
      const newNode = new DequeNode(smallDequeueType, key, value);
      this.map.set(key, newNode);
      this.smallDequeue.pushFront(newNode);
      this.currentSize += 1;
    }

    if (this.currentSize > this.limitSize) {
      this.currentSize -= 1;

      if (this.smallDequeue.size > this.limitSmall) {
        this.evictSmall();
      } else {
        this.evictMain();
      }
    }
  }

  has(key: Key): boolean {
    return this.map.has(key);
  }

  delete(key: Key): void {
    const valueNode = this.map.get(key);

    if (valueNode) {
      this.map.delete(key);
      this[valueNode.type].remove(valueNode);
      this.currentSize -= 1;
    }
  }

  clear(): void {
    this.currentSize = 0;
    this.map.clear();
    this.ghostDequeue.clear();
    this.mainDequeue.clear();
    this.smallDequeue.clear();
  }

  private evictSmall() {
    while (this.smallDequeue.size > 0) {
      const node = this.smallDequeue.pop();

      if (node.freq >= 1) {
        // insert to the main because was hit
        node.freq = 0;
        node.type = mainDequeueType;
        this.mainDequeue.pushFront(node);

        if (this.mainDequeue.size > this.limitMain) {
          this.evictMain();
          break;
        }
      } else {
        // insert to the ghost
        node.value = null;
        node.type = ghostDequeueType;
        node.freq = 0;
        this.ghostDequeue.pushFront(node);

        if (this.ghostDequeue.size > this.limitGhost) {
          const ghostElement = this.ghostDequeue.pop();
          this.map.delete(ghostElement.key);
        }
        break
      }
    }
  }

  private evictMain() {
    while (this.mainDequeue.size > 0) {
      const node = this.mainDequeue.pop();

      if (node.freq >= 1) {
        node.freq -= 1;
        this.mainDequeue.pushFront(node);
      } else {
        this.map.delete(node.key);
        break;
      }
    }
  }

  get size() {
    return this.currentSize;
  }
}

