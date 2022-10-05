class Position {
    constructor(public row: number, public col: number) { }

    toString(): string {
        return "(" + this.row + ", " + this.col + ")";
    }
}

type ClockType = "Producer" | "Verifier" | "Reference";

// class ClockOptions {
//     constructor(public type: ClockType, public position: Position) {}
// }

interface ClockOptions {
    type: ClockType;
    position: Position;
}

class UpgradeInfo {

}

abstract class Clock {

    abstract readonly clockType: ClockType;

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

    remainingTime(): number {
        if (!this.animation) {
            return 0;
        }
        const duration = this.animation.effect!.getComputedTiming().duration as number;
        return duration - this.animation.currentTime!;
    }

    toString(): string {
        return this.getType() + " at " + this.positionString();
    }

    getOpCount(): number {
        return 1;
    }

    pause(manual:boolean = true) {
        this.manually_paused = manual || this.manually_paused;
        if (this.animation) {
            this.animation.pause();
        }
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

    positionString(): string {
        return this.options.position.toString();
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

class ReferenceClock extends Clock  {
    readonly clockType = "Reference";

    last_tick: number = 0;

    circle: SVGCircleElement;

    private readonly duration = reference_clock_timing.duration;

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


        background_anim.ready.then(() => {
            const now = performance.now();
            console.log(this + " ready");
            console.log("     start time: " + background_anim.startTime! + ", ready at " + background_anim.timeline!.currentTime!)
            const diff = now - start;
            console.log("     performance diff " + diff);
            const total_diff = diff + background_anim.currentTime!;
            console.log("     total diff: " + total_diff)
            console.log("     since last tick: " + (now - this.last_tick));
            const new_time = total_diff % this.duration;
            if (total_diff > 0) {
                const missed = Math.floor(total_diff / 1000);
                console.log("     lag detected, " + missed + " ticks missed");
                console.log("     Setting current time to " + new_time);
            }
            background_anim.currentTime! = new_time;
        });
        background_anim.addEventListener("finish", (event) => {
            const diff = event.timelineTime! - background_anim.startTime!;
            console.log(this + "finish");
            const perf_diff = performance.now() - start;
            console.log("     timeline diff " + diff);
            console.log("     performance diff " + perf_diff);
            let delay = 0;
            const missed_time = perf_diff - this.duration;
            if (missed_time  > 0) {
                const missed = Math.floor(missed_time / this.duration);
                console.log("     lag detected on finish, " + missed + " ticks missed");
                delay = missed_time % this.duration;
                console.log("     adding " + delay + "ms to next animation");
            }
            this.tick();
            this.animate(delay)
        });

    }

}

// type Clock = ProducerClock | VerifierClock;