const TEN_SECONDS = 10 * 1000;
class ClockManager {

    //generator: Generator;
    grid: Map<String, Clock> = new Map<String, Clock>();
    counts: Map<ClockType, number> = new Map<ClockType, number>();

    constructor() {
        this.counts.set("Producer", 0);
        this.counts.set("Verifier", 0);
    }
    teardown() {
        this.forEachClock(c => c.refund());
        this.grid.clear();
    }
    hasClock(pos: Position): boolean {
        return this.grid.has(pos.toString());
    }

    canAddClock(pos: Position): boolean {
        return !this.grid.has(pos.toString());
    }

    addClock(pos: Position, opts: ClockOptions): Clock {
        let clock: Clock;
        switch (opts.type) {
            case "Producer":
                clock = new ProducerClock(opts);
                this.counts.set("Producer", this.counts.get("Producer")! + 1);
                break;
                case "Verifier":
                this.counts.set("Verifier", this.counts.get("Verifier")! + 1);
                clock = new VerifierClock(opts);
                break;
            default:
                throw new Error("Unknown clock type");

        }
        this.grid.set(pos.toString(), clock);
        return clock;
    }

    clockCount(type: ClockType): number {
        return this.counts.get(type) ?? 0;
    }

    removeClock(pos: Position): Clock | undefined {
        let c = this.grid.get(pos.toString());
        if (c) {
            this.grid.delete(pos.toString());
        }
        return c;
    }

    forEachClock(f: (clock: Clock) => void) {
        this.grid.forEach(f);
    }

    getClock(pos: Position): Clock | undefined {
        return this.grid.get(pos.toString());
    }

    getClocks(): Array<Clock> {
        return Array.from(this.grid.values());
    }

    moveClock(from: Position, to: Position) {
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