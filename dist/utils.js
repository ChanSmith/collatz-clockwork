// filter(iterable, f) yields only the values where f(v) is true
function* filter(iter, f) {
    for (const v of iter) {
        if (f(v)) {
            yield v;
        }
    }
}
function any(iter, f) {
    for (const v of iter) {
        if (f(v)) {
            return true;
        }
    }
    return false;
}
function all(iter, f) {
    for (const v of iter) {
        if (!f(v)) {
            return false;
        }
    }
    return true;
}
function first(iter, f) {
    for (const v of iter) {
        if (f(v)) {
            return v;
        }
    }
    return undefined;
}
// map(iterable, f) yields f(v) for each value v
function* map(iter, f) {
    for (const v of iter) {
        yield f(v);
    }
}
// reduce(iterable, f, init) return f(v_n,f(...f(f(init, v_0), v_1)...))
function reduce(iter, f, initial) {
    let acc = initial;
    for (const v of iter) {
        acc = f(acc, v);
    }
    return acc;
}
function* range(start, end, step = 1) {
    for (let i = start; i < end; i += step) {
        yield i;
    }
}
