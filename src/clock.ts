class Position {
    constructor(public row: number, public col: number) { }

    toString(): string {
        return "(" + this.row + ", " + this.col + ")";
    }

    static parse(str: string): Position {
        let match = str.match(/\((\d+), (\d+)\)/);
        if (match == null) {
            throw new Error("Invalid position string");
        }
        return new Position(parseInt(match[1]), parseInt(match[2]));
    }

    equals(other: Position): boolean {
        return this.row == other.row && this.col == other.col;
    }

    copy(): Position {
        return new Position(this.row, this.col);
    }

}

type ClockType = "Producer" | "Verifier" | "Reference";

interface ClockOptions {
    type: ClockType;
    position: Position;
}

class UpgradeInfo {

}

abstract class Clock {

    readonly clockType: ClockType;

    animation?: Animation;

    manually_paused: boolean = false;

    getType(): ClockType {
        return this.clockType;
    }

    constructor(public game: Game, public options: ClockOptions) { }

    getPossibleUpgrades(): Map<string, UpgradeInfo> {
        return new Map<string, UpgradeInfo>();
    }

    applyUpgrade(key: string) {

    }

    tick() {
        // console.log("tick from " + this.toString());
    }

    reset() {
        this.animation!.currentTime = 0;
    }

    tickAndReset() {
        this.tick();
        this.reset();
    }

    // TODO: implement handling more than one tick if needed
    advanceBy(amount: number) {
        if (!this.animation) return;
        if (!this.animation.currentTime) {
            this.animation.currentTime = 0;
        }
        if (amount >= this.remainingTime()) {
            amount -= this.remainingTime();
            this.tickAndReset();
        }
        this.animation.currentTime += amount;
    }

    unscaledDuration(): number {
        if (!this.animation || !this.animation.effect) {
            return TEN_SECONDS;
        }
        // assume as number and not "<x>s" or "<x>ms"
        return this.animation.effect.getTiming().duration as number;
    }

    scaledDuration(): number {
        if (!this.animation) {
            return TEN_SECONDS;
        }
        return this.unscaledDuration() / this.animation!.playbackRate ?? 1;
    }

    remainingTime(): number {
        if (!this.animation) {
            return TEN_SECONDS;
        }
        const speed = this.animation.playbackRate ?? 1;
        // return duration / speed;
        return (this.unscaledDuration() - this.animation.currentTime!) / speed;
    }

    toString(): string {
        return this.getType() + " at " + this.options.position.toString();
    }

    getOpCount(): number {
        return 1;
    }

    pause(manual: boolean = true) {
        this.manually_paused = manual || this.manually_paused;
        if (this.animation) {
            this.animation.pause();
        }
    }

    getPosition(): Position {
        return this.options.position.copy();
    }

    setPosition(pos: Position) {
        this.options.position = pos.copy();
    }

    paused(): boolean {
        return (this.animation?.playState ?? "running") == "paused"
    }

    unpause() {
        if (this.animation) {
            this.animation.play();
        }
        this.manually_paused = false;
    }

}

class ProducerClock extends Clock {
    readonly clockType = "Producer";

    tick() {
        super.tick();
        const success = this.game.applyOps(this.getOpCount());
        this.game.table_view.animateCellSuccess(this.options.position, success);
    }

}

class VerifierClock extends Clock {
    readonly clockType = "Verifier";

    tick() {
        super.tick();
        const success = this.game.verify();
        this.game.table_view.animateCellSuccess(this.options.position, success);
    }

}

class ReferenceClock extends Clock {
    readonly clockType = "Reference";

    last_tick: number = 0;

    circle: SVGCircleElement;


    constructor(game: Game, options: ClockOptions) {
        super(game, options);
        this.last_tick = performance.now();
        this.attachClock();
        this.animate();
    }

    tick() {
        super.tick();
        if (!this.last_tick) {
            console.log("Reference clock ticked. First tick");
            this.last_tick = performance.now();
        } else {
            const now = performance.now();
            const delta = now - this.last_tick;
            this.last_tick = now;
            console.log("Reference clock ticked. Delta: " + delta);
        }
    }

    attachClock() {
        // Copying this from table view for now
        let s = document.createElementNS(SVG_NS, "svg") as SVGSVGElement;
        s.classList.add("clock");
        s.classList.add(this.getType());

        let timer_background = document.createElementNS(SVG_NS, "circle") as SVGCircleElement;
        timer_background.classList.add("timer-background");
        timer_background.classList.add(this.getType());

        timer_background.setAttribute("fill", "transparent");
        // timer_background.setAttribute("stroke", CLOCK_PALETTE[clock.getType()]);
        timer_background.setAttribute("cx", "50%");
        timer_background.setAttribute("cy", "50%");
        timer_background.setAttribute("r", "25%");

        this.circle = timer_background;
        s.appendChild(timer_background);
        document.getElementById("reference-clock")!.appendChild(s);
    }

    animate(delay: number = 0) {
        const start = performance.now();
        let background_anim = this.circle.animate(clock_background_keyframes, reference_clock_timing);
        background_anim.currentTime = delay;
        this.animation = background_anim;
        background_anim.addEventListener("finish", (event) => {
            this.tick();
            this.animate()
        });

    }

}