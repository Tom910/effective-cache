export const mainDequeueType = 'mainDequeue';
export const smallDequeueType = 'smallDequeue';
export const ghostDequeueType = 'ghostDequeue';

export class DequeNode<DequeKey = any, DequeValue = any> {
  constructor(
    public type: typeof mainDequeueType | typeof smallDequeueType | typeof ghostDequeueType,
    public key: DequeKey,
    public value: DequeValue | null,
    public freq: number = 0,
    public next: DequeNode | null = null,
    public prev: DequeNode | null = null
  ) { }
}

// in the head most actual, in the end least actual
export class Deque<Key, Value> {
  size = 0;
  constructor() {
    this.head = null;
    this.end = null;
  }

  head: DequeNode<Key, Value> | null;
  end: DequeNode<Key, Value> | null;

  pushFront(node: DequeNode) {
    this.size += 1;

    if (!this.head) {
      this.head = node;
      this.end = node;
    } else {
      node.next = this.head;
      this.head.prev = node;
      this.head = node;
    }

    return node;
  }

  pop() {
    this.size -= 1;

    const current = this.end;
    this.end = this.end!.prev;

    if (this.end) {
      this.end.next = null;
    } else {
      this.head = null;
    }

    current!.prev = null;

    return current as DequeNode<Key, Value>;
  }

  remove(node: DequeNode<Key, Value>) {
    this.size -= 1;

    this.ejectNode(node);
  }

  clear() {
    this.head = null;
    this.end = null;
    this.size = 0;
  }

  private ejectNode(node: DequeNode<Key, Value>) {
    const nextNode = node.next;
    const prevNode = node.prev;
    if (nextNode) {
      nextNode.prev = prevNode;
    }
    if (prevNode) {
      prevNode.next = nextNode;
    }
    if (node === this.head) {
      this.head = nextNode;
    }

    if (node === this.end) {
      this.end = prevNode;
    }

    node.next = null;
    node.prev = null;
  }
}
