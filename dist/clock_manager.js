const TEN_SECONDS = 10 * 1000;
class ClockManager {
    constructor() {
        //generator: Generator;
        this.grid = new Map();
        this.counts = new Map();
        this.counts.set("Producer", 0);
        this.counts.set("Verifier", 0);
    }
    hasClock(pos) {
        return this.grid.has(pos.toString());
    }
    canAddClock(pos) {
        return !this.grid.has(pos.toString());
    }
    addClock(pos, opts) {
        let clock;
        switch (opts.type) {
            case "Producer":
                clock = new ProducerClock(opts);
                this.counts.set("Producer", this.counts.get("Producer") + 1);
                break;
            case "Verifier":
                this.counts.set("Verifier", this.counts.get("Verifier") + 1);
                clock = new VerifierClock(opts);
                break;
            default:
                throw new Error("Unknown clock type");
        }
        this.grid.set(pos.toString(), clock);
        return clock;
    }
    clockCount(type) {
        var _a;
        return (_a = this.counts.get(type)) !== null && _a !== void 0 ? _a : 0;
    }
    removeClock(pos) {
        let c = this.grid.get(pos.toString());
        if (c) {
            this.grid.delete(pos.toString());
        }
        return c;
    }
    forEachClock(f) {
        this.grid.forEach(f);
    }
    getClock(pos) {
        return this.grid.get(pos.toString());
    }
    getClocks() {
        return Array.from(this.grid.values());
    }
    moveClock(from, to) {
        let c = this.removeClock(from);
        if (!c) {
            throw new Error("Tried to move clock from empty position");
        }
        this.grid.delete(from.toString());
        let dest = this.removeClock(to);
        if (dest) {
            this.grid.set(from.toString(), dest);
            dest.setPosition(from);
        }
        this.grid.set(to.toString(), c);
        c.setPosition(to);
        return dest;
    }
}
