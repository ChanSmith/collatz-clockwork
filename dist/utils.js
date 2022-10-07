// filter(iterable, f) yields only the values where f(v) is true
function* filter(iter, f) {
    for (const v of iter) {
        if (f(v)) {
            yield v;
        }
    }
}
// map(iterable, f) yields f(v) for each value v
function* map(iter, f) {
    for (const v of iter) {
        yield f(v);
    }
}
// reduce(iterable, f, init) yields f(v_n,f(...f(f(init, v_0), v_1)...))
function* reduce(iter, f, initial) {
    let acc = initial;
    for (const v of iter) {
        acc = f(acc, v);
        yield acc;
    }
}
