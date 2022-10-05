type Logger = typeof console.log | typeof console.error | typeof console.warn | null | undefined;


// IteratorValue<T> is the type of the value returned by an iterator
type IteratorValue<I> = I extends IterableIterator<infer V> ? V : never;

// filter(iterable<v>, f) yields only the values where f(v) is true
function* filter<T extends IterableIterator<IteratorValue<T>>>(iter: T, f: (v: IteratorValue<T>) => boolean) {
    for (const v of iter) {
        if (f(v)) {
            yield v;
        }
    }
}