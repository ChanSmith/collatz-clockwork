class Position {
    constructor(row, col) {
        this.row = row;
        this.col = col;
    }
    toString() {
        return "(" + this.row + ", " + this.col + ")";
    }
    static parse(str) {
        let match = str.match(/\((\d+), (\d+)\)/);
        if (match == null) {
            throw new Error("Invalid position string");
        }
        return new Position(parseInt(match[1]), parseInt(match[2]));
    }
    equals(other) {
        return this.row == other.row && this.col == other.col;
    }
    copy() {
        return new Position(this.row, this.col);
    }
}
class UpgradeInfo {
}
class Clock {
    constructor(game, options) {
        this.game = game;
        this.options = options;
        this.manually_paused = false;
        // this.upgrade_tree = new UpgradeTree(this.getType());
    }
    getType() {
        return this.clockType;
    }
    getPossibleUpgrades() {
        return this.upgrade_tree.getPossibleUpgrades();
    }
    getUpgradeMenuItems() {
        let ret = [];
        const possible_upgrades = this.getPossibleUpgrades();
        for (const upgrade_id of upgradeIds(possible_upgrades)) {
            const upgrade = UPGRADES[upgrade_id];
            const new_state = possible_upgrades[upgrade_id];
            const new_level = new_state.level;
            let level_label;
            if (upgrade.max_level !== Infinity) {
                level_label = " (" + new_level + " / " + upgrade.max_level + ")";
            }
            else {
                level_label = " (" + new_level + " / ∞)";
            }
            ret.push({
                label: upgrade.name + level_label,
                callback: () => this.applyUpgrade(upgrade_id, new_state),
            });
        }
        // TODO: show locked ones with requirement
        return ret;
    }
    applyUpgrade(key, new_state) {
        this.upgrade_tree.applyUpgrade(key, new_state);
    }
    tick() {
        // console.log("tick from " + this.toString());
    }
    reset() {
        this.animation.currentTime = 0;
    }
    tickAndReset() {
        this.tick();
        this.reset();
    }
    // TODO: implement handling more than one tick if needed
    advanceBy(amount) {
        if (!this.animation)
            return;
        if (!this.animation.currentTime) {
            this.animation.currentTime = 0;
        }
        if (amount >= this.remainingTime()) {
            amount -= this.remainingTime();
            this.tickAndReset();
        }
        this.animation.currentTime += amount;
    }
    unscaledDuration() {
        if (!this.animation || !this.animation.effect) {
            return TEN_SECONDS;
        }
        // assume as number and not "<x>s" or "<x>ms"
        return this.animation.effect.getTiming().duration;
    }
    scaledDuration() {
        var _a;
        if (!this.animation) {
            return TEN_SECONDS;
        }
        return (_a = this.unscaledDuration() / this.animation.playbackRate) !== null && _a !== void 0 ? _a : 1;
    }
    remainingTime() {
        var _a;
        if (!this.animation) {
            return TEN_SECONDS;
        }
        const speed = (_a = this.animation.playbackRate) !== null && _a !== void 0 ? _a : 1;
        // return duration / speed;
        return (this.unscaledDuration() - this.animation.currentTime) / speed;
    }
    toString() {
        return this.getType() + " at " + this.options.position.toString();
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
    getPosition() {
        return this.options.position.copy();
    }
    setPosition(pos) {
        this.options.position = pos.copy();
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
}
class ProducerClock extends Clock {
    constructor(game, options) {
        super(game, options);
        this.clockType = "Producer";
        this.upgrade_tree = new UpgradeTree(this.clockType);
    }
    tick() {
        super.tick();
        const success = this.game.applyOps(this.getOpCount());
        this.game.table_view.animateCellSuccess(this.options.position, success);
    }
}
class VerifierClock extends Clock {
    constructor(game, options) {
        super(game, options);
        this.clockType = "Verifier";
        this.upgrade_tree = new UpgradeTree(this.clockType);
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
        background_anim.addEventListener("finish", (event) => {
            this.tick();
            this.animate();
        });
    }
}
