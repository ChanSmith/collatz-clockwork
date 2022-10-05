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

// map(iterable, f) yields f(v) for each value v
function* map<T extends IterableIterator<IteratorValue<T>>, U>(iter: T, f: (v: IteratorValue<T>) => U) {
    for (const v of iter) {
        yield f(v);
    }
}

// reduce(iterable, f, init) yields f(v_n,f(...f(f(init, v_0), v_1)...))
function* reduce<T extends IterableIterator<IteratorValue<T>>, U>(iter: T, f: (acc: U, v: IteratorValue<T>) => U, initial: U) {
    let acc = initial;
    for (const v of iter) {
        acc = f(acc, v);
        yield acc;
    }
}
