const CLOCK_RESOLUTION = 1024;
const TEN_SECONDS = 10 * 1000;
// Add new things this many buckets forward, so it lines up with the animation
const BUCKET_OFFSET = 0;

class ClockManager {

    //generator: Generator;
    game: Game;

    index: number = 0;
    // TODO: can probably figure this out from the animation instead of storing it
    buckets: Array<Array<Clock>> = new Array<Array<Clock>>(CLOCK_RESOLUTION);
    grid: Map<String, Clock> = new Map<String, Clock>();

    constructor(game: Game) {
        this.game = game;
        for (let i = 0; i < CLOCK_RESOLUTION; i++) {
            this.buckets[i] = new Array<Clock>();
            // window.setTimeout(() => window.setInterval(() => this.tickBucket(i), TEN_SECONDS), i * TEN_SECONDS / CLOCK_RESOLUTION);
        }
      //  window.setInterval(() => this.tick(), TEN_SECONDS / CLOCK_RESOLUTION);
    }

    tick() {
        this.index = (this.index + 1) % CLOCK_RESOLUTION;
        if (this.index == 0) {
            console.log("Tick hit 0");
        }
        let bucket = this.buckets[this.index];
        for (let i = 0; i < bucket.length; i++) {
            let clock = bucket[i];
            clock.tick();
        }
    }

    tickBucket(index: number) {
        let bucket = this.buckets[index];
        for (let i = 0; i < bucket.length; i++) {
            let clock = bucket[i];
            clock.tick();
        }
    }

    canAddClock(pos: Position): boolean {
        return !this.grid.has(pos.toString());
    }

    static createClock(game: Game, opts: ClockOptions): Clock {
        switch (opts.type) {
            case "Producer":
                return new ProducerClock(game, opts);
            case "Verifier":
                return new VerifierClock(game, opts);
            default:
                throw new Error("Unknown clock type");
        }
    }

    addClock(pos: Position, opts: ClockOptions): Clock {
        let clock: Clock;
        switch (opts.type) {
            case "Producer":
                clock = new ProducerClock(this.game, opts);
                break;
            case "Verifier":
                clock = new VerifierClock(this.game, opts);
                break;
            default:
                throw new Error("Unknown clock type");

        }
        this.grid.set(pos.toString(), clock);
        this.buckets[(this.index + BUCKET_OFFSET) % CLOCK_RESOLUTION].push(clock);
        return clock;
        // this.game.table_view.addClock(pos, clock); -- handled by game
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

    moveClock(from: Position, to: Position) {
        let c = this.removeClock(from);
        if (!c) {
            throw new Error("Tried to move clock from empty position");
        }
        this.grid.delete(from.toString());
        let dest = this.removeClock(to);
        if (dest) {
            this.grid.set(from.toString(), dest);
        }
        this.grid.set(to.toString(), c);
    }

}