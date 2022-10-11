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
    constructor(options) {
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
            const possible_upgrade = possible_upgrades[upgrade_id];
            const upgrade = UPGRADES_OPTIONS[upgrade_id];
            const new_level = possible_upgrade.level;
            const cost = possible_upgrade.cost;
            const disabled = !Game.canPurchase(possible_upgrade);
            let level_label;
            if (upgrade.max_level !== Infinity) {
                level_label = " (" + new_level + " / " + upgrade.max_level + ")";
            }
            else {
                level_label = " (" + new_level + " / ∞)";
            }
            ret.push({
                label: upgrade.name + " $" + cost + level_label,
                callback: () => this.applyUpgrade(upgrade_id, possible_upgrade),
                disabled: disabled,
                preventCloseOnClick: disabled,
            });
        }
        // TODO: show locked ones with requirement
        return ret;
    }
    applyUpgrade(key, possible_upgrade) {
        Game.purchase(possible_upgrade);
        this.upgrade_tree.applyUpgrade(key, possible_upgrade);
        if (key == "playback_speed") {
            this.animation.updatePlaybackRate(Math.pow(2, possible_upgrade.level));
        }
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
    // Advance the animation by the given amount of real time (milliseconds)
    // TODO: implement handling more than one tick if needed
    advanceBy(amount) {
        var _a;
        if (!this.animation)
            return;
        if (!this.animation.currentTime) {
            this.animation.currentTime = 0;
        }
        if (amount >= this.remainingTime()) {
            amount -= this.remainingTime();
            this.tickAndReset();
        }
        this.animation.currentTime += (amount * ((_a = this.animation.playbackRate) !== null && _a !== void 0 ? _a : 1));
    }
    // Returns the unscaled duration of the animation
    unscaledDuration() {
        return clock_background_timing.duration;
    }
    // Returns the real duration of the animation
    scaledDuration() {
        var _a;
        if (!this.animation) {
            return TEN_SECONDS;
        }
        return this.unscaledDuration() / ((_a = this.animation.playbackRate) !== null && _a !== void 0 ? _a : 1);
    }
    // Returns real time remaining
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
    constructor(options) {
        super(options);
        this.clockType = "Producer";
        this.upgrade_tree = new UpgradeTree(this.clockType);
    }
    tick() {
        super.tick();
        const op_count = this.getOpCount();
        const applied_ops = Game.applyOps(op_count);
        if (applied_ops > 0) {
            this.advanceNearby();
        }
        // TODO: animate the cell multiple times, or show a different color based on ratio 
        // of applied ops to requested ops
        const success = applied_ops > 0;
        Game.table_view.animateCellSuccess(this.options.position, success);
    }
    getOpCount() {
        return 1 + this.upgrade_tree.getUpgradeLevel("applications_per_cycle");
    }
    advanceNearby() {
        const upgrade_level = this.upgrade_tree.getUpgradeLevel("advance_nearby");
        if (upgrade_level <= 0) {
            return;
        }
        const nearby = Game.table_view.getNearbyClocks(this.options.position);
        for (const clock of nearby) {
            clock.advanceBy(upgrade_level * ADVANCE_NEARBY_AMOUNT);
        }
    }
}
class VerifierClock extends Clock {
    constructor(options) {
        super(options);
        this.clockType = "Verifier";
        this.upgrade_tree = new UpgradeTree(this.clockType);
    }
    tick() {
        super.tick();
        const success = Game.verify();
        Game.table_view.animateCellSuccess(this.options.position, success);
    }
}
class ReferenceClock extends Clock {
    constructor(game, options) {
        super(options);
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
    unscaledDuration() {
        return reference_clock_timing.duration;
    }
}
