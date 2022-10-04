class CollatzGenerator {
    getSequence(start, max_length) {
        let seq = [];
        let iter = 0;
        while (start != 1 && iter < max_length) {
            if (start % 2) {
                start = ((3 * start) + 1) / 2;
            }
            else {
                start = start / 2;
            }
            seq.push(start);
            iter++;
        }
        return seq;
    }
}
