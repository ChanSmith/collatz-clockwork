type Logger = typeof console.log | typeof console.error | typeof console.warn | null | undefined;


// IteratorValue<IterableIterator<V>> = V
type IteratorValue<I> = I extends IterableIterator<infer V> ? V : never;

// filter(iterable, f) yields only the values where f(v) is true
function* filter<T extends IterableIterator<IteratorValue<T>>>(iter: T, f: (v: IteratorValue<T>) => boolean) {
    for (const v of iter) {
        if (f(v)) {
            yield v;
        }
    }
}

function any<T extends IterableIterator<IteratorValue<T>>>(iter: T, f: (v: IteratorValue<T>) => boolean): boolean {
    for (const v of iter) {
        if (f(v)) {
            return true;
        }
    }
    return false;
}

function all<T extends IterableIterator<IteratorValue<T>>>(iter: T, f: (v: IteratorValue<T>) => boolean): boolean {
    for (const v of iter) {
        if (!f(v)) {
            return false;
        }
    }
    return true;
}

function first<T extends IterableIterator<IteratorValue<T>>>(iter: T, f: (v: IteratorValue<T>) => boolean): IteratorValue<T> | undefined {
    for (const v of iter) {
        if (f(v)) {
            return v;
        }
    }
    return undefined;
}

// map(iterable, f) yields f(v) for each value v
function* map<T extends IterableIterator<IteratorValue<T>>, U>(iter: T, f: (v: IteratorValue<T>) => U) {
    for (const v of iter) {
        yield f(v);
    }
}

// reduce(iterable, f, init) return f(v_n,f(...f(f(init, v_0), v_1)...))
function reduce<T extends IterableIterator<IteratorValue<T>>, U>(iter: T, f: (acc: U, v: IteratorValue<T>) => U, initial: U): U {
    let acc = initial;
    for (const v of iter) {
        acc = f(acc, v);
    }
    return acc;
}


function* range(start: number, end: number, step: number = 1) {
    for (let i = start; i < end; i += step) {
        yield i;
    }
}

function leftChildIndex(i: number) {
    return 2 * i + 1;
}
function rightChildIndex(i: number) {
    return 2 * i + 2;
}
function parentIndex(i: number) {
    return Math.floor((i - 1) / 2);
}

class PriorityQueue<T> {
    #heap: Array<T>;
    #map: Map<T, number>; 
    #priorityFunction: (a: T) => number;

    constructor(priorityFunction: (a: T) => number) {
        this.#heap = [];
        this.#priorityFunction = priorityFunction;
    }

    reset(values: Array<T>) {
        this.#heap = values.slice();
        this.#map = new Map();
        if (values.length === 0) {
            return;
        }
        for (let i = 0; i < this.#heap.length; i++) {
            this.#map.set(this.#heap[i], i);
        }
        for (let i = Math.floor(this.#heap.length / 2); i >= 0; i--) {
            this.#bubbleDown(i);
        }
    }

    push(...values: Array<T>) {
        for (const v of values) {
            this.#heap.push(v);
            this.#map.set(v, this.#heap.length - 1);
            this.#bubbleUp(this.#heap.length - 1);
        }
    }

    peek(): T | undefined {
        return this.#heap[0];
    }

    peekPriority(): number {
        return this.#priorityFunction(this.#heap[0]);
    }

    pop(): T | undefined {
        if (this.#heap.length === 0) {
            return undefined;
        }
        const result = this.#heap[0];
        this.#map.delete(result);
        const last = this.#heap.pop() as T;
        if (last !== result) {
            this.#heap[0] = last;
            this.#map.set(last, 0);
            this.#bubbleDown(0);
        }
        return result
    }

    #bubbleUp(i: number) {
        const parent = parentIndex(i);
        if (parent >= 0 && this.#priorityFunction(this.#heap[parent]) > this.#priorityFunction(this.#heap[i])) {
            this.#swap(parent, i);
            this.#bubbleUp(parent);
        }
    }

    #bubbleDown(i: number) {
        const left = leftChildIndex(i);
        const right = rightChildIndex(i);
        let min = i;
        let minPri = this.#priorityFunction(this.#heap[i]);
        let leftPri;
        if (left < this.#heap.length && (leftPri = this.#priorityFunction(this.#heap[left])) < minPri) {
            min = left;
            minPri = leftPri;
        }
        if (right < this.#heap.length && this.#priorityFunction(this.#heap[right]) < minPri) {
            min = right;
        }
        if (min !== i) {
            this.#swap(min, i);
            this.#bubbleDown(min);
        }
    }

    updatePriority(v: T) {
        const i = this.#map.get(v);
        if (i !== undefined) {
            this.#bubbleUp(i);
            this.#bubbleDown(i);
        }
    }

    updateAllPriorities() {
        for (let i = Math.floor(this.#heap.length / 2); i >= 0; i--) {
            this.#bubbleDown(i);
        }
    }

    #swap(i: number, j: number) {
        const temp = this.#heap[i];
        this.#heap[i] = this.#heap[j];
        this.#heap[j] = temp;
        this.#map.set(this.#heap[i], i);
        this.#map.set(this.#heap[j], j);
    }

    get length(): number {
        return this.#heap.length;
    }
}