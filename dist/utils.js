function* filter(iter, f) {
    for (const v of iter) {
        if (f(v)) {
            yield v;
        }
    }
}
