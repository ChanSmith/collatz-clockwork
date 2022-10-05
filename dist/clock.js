class Position {
    constructor(row, col) {
        this.row = row;
        this.col = col;
    }
    toString() {
        return "(" + this.row + ", " + this.col + ")";
    }
}
class UpgradeInfo {
}
class Clock {
    constructor(game, options) {
        this.game = game;
        this.options = options;
        this.manually_paused = false;
    }
    getType() {
        return this.clockType;
    }
    getPossibleUpgrades() {
        return new Map();
    }
    applyUpgrade(key) {
    }
    tick() {
        // console.log("tick from " + this.toString());
    }
    remainingTime() {
        if (!this.animation) {
            return 0;
        }
        const duration = this.animation.effect.getComputedTiming().duration;
        return duration - this.animation.currentTime;
    }
    toString() {
        return this.getType() + " at " + this.positionString();
    }
    getOpCount() {
        return 1;
    }
    pause(manual = true) {
        this.manually_paused = manual || this.manually_paused;
        if (this.animation) {
            this.animation.pause();
        }
    }
    paused() {
        var _a, _b;
        return ((_b = (_a = this.animation) === null || _a === void 0 ? void 0 : _a.playState) !== null && _b !== void 0 ? _b : "running") == "paused";
    }
    unpause() {
        if (this.animation) {
            this.animation.play();
        }
        this.manually_paused = false;
    }
    positionString() {
        return this.options.position.toString();
    }
}
class ProducerClock extends Clock {
    constructor() {
        super(...arguments);
        this.clockType = "Producer";
    }
    tick() {
        super.tick();
        const success = this.game.applyOps(this.getOpCount());
        this.game.table_view.animateCellSuccess(this.options.position, success);
    }
}
class VerifierClock extends Clock {
    constructor() {
        super(...arguments);
        this.clockType = "Verifier";
    }
    tick() {
        super.tick();
        const success = this.game.verify();
        this.game.table_view.animateCellSuccess(this.options.position, success);
    }
}
class ReferenceClock extends Clock {
    constructor(game, options) {
        super(game, options);
        this.clockType = "Reference";
        this.last_tick = 0;
        this.duration = reference_clock_timing.duration;
        this.last_tick = performance.now();
        this.attachClock();
        this.animate();
    }
    tick() {
        super.tick();
        if (!this.last_tick) {
            console.log("Reference clock ticked. First tick");
            this.last_tick = performance.now();
        }
        else {
            const now = performance.now();
            const delta = now - this.last_tick;
            this.last_tick = now;
            console.log("Reference clock ticked. Delta: " + delta);
        }
    }
    attachClock() {
        // Copying this from table view for now
        let s = document.createElementNS(SVG_NS, "svg");
        s.classList.add("clock");
        s.classList.add(this.getType());
        let timer_background = document.createElementNS(SVG_NS, "circle");
        timer_background.classList.add("timer-background");
        timer_background.classList.add(this.getType());
        timer_background.setAttribute("fill", "transparent");
        // timer_background.setAttribute("stroke", CLOCK_PALETTE[clock.getType()]);
        timer_background.setAttribute("cx", "50%");
        timer_background.setAttribute("cy", "50%");
        timer_background.setAttribute("r", "25%");
        this.circle = timer_background;
        s.appendChild(timer_background);
        document.getElementById("reference-clock").appendChild(s);
    }
    animate(delay = 0) {
        const start = performance.now();
        let background_anim = this.circle.animate(clock_background_keyframes, reference_clock_timing);
        background_anim.currentTime = delay;
        this.animation = background_anim;
        background_anim.ready.then(() => {
            const now = performance.now();
            console.log(this + " ready");
            console.log("     start time: " + background_anim.startTime + ", ready at " + background_anim.timeline.currentTime);
            const diff = now - start;
            console.log("     performance diff " + diff);
            const total_diff = diff + background_anim.currentTime;
            console.log("     total diff: " + total_diff);
            console.log("     since last tick: " + (now - this.last_tick));
            const new_time = total_diff % this.duration;
            if (total_diff > 0) {
                const missed = Math.floor(total_diff / 1000);
                console.log("     lag detected, " + missed + " ticks missed");
                console.log("     Setting current time to " + new_time);
            }
            background_anim.currentTime = new_time;
        });
        background_anim.addEventListener("finish", (event) => {
            const diff = event.timelineTime - background_anim.startTime;
            console.log(this + "finish");
            const perf_diff = performance.now() - start;
            console.log("     timeline diff " + diff);
            console.log("     performance diff " + perf_diff);
            let delay = 0;
            const missed_time = perf_diff - this.duration;
            if (missed_time > 0) {
                const missed = Math.floor(missed_time / this.duration);
                console.log("     lag detected on finish, " + missed + " ticks missed");
                delay = missed_time % this.duration;
                console.log("     adding " + delay + "ms to next animation");
            }
            this.tick();
            this.animate(delay);
        });
    }
}
// type Clock = ProducerClock | VerifierClock;
