var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var _Clock_paused;
var tickLog;
// tickLog = console.log;
class Position {
    constructor(row, col) {
        this.row = row;
        this.col = col;
    }
    saveState() {
        return { row: this.row, col: this.col };
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
class Clock {
    constructor(options) {
        this.options = options;
        this.playback_rate = 1;
        _Clock_paused.set(this, false);
        this.manually_paused = false;
        this.upgrade_tree = new UpgradeTree(new.target.clockType);
        this.upgrade_graphics_state = {};
    }
    saveState() {
        var _a, _b;
        return {
            type: this.getType(),
            position: this.options.position.saveState(),
            upgrades: this.upgrade_tree.saveState(),
            time: (_b = (_a = this.animation) === null || _a === void 0 ? void 0 : _a.currentTime) !== null && _b !== void 0 ? _b : 0,
        };
    }
    restoreFrom(state) {
        this.upgrade_tree.restoreFrom(state.upgrades);
        for (const upgrade_id of this.upgrade_tree.getUnlockedIds()) {
            const level = this.upgrade_tree.getUpgradeLevel(upgrade_id);
            this.addUpgradeGraphic(upgrade_id, level);
        }
        this.updatePlaybackRate();
    }
    getType() {
        // Ugly, but doesn't seem to be another way to refer to a static member polymorphically
        return this.constructor.clockType;
    }
    getPossibleUpgrades() {
        return this.upgrade_tree.getPossibleUpgrades();
    }
    getMaxPossibleUpgrades(currency) {
        return this.upgrade_tree.getMaxPossibleUpgrades(currency);
    }
    getCheapestUpgrade() {
        const possible_upgrades = this.upgrade_tree.getPossibleUpgrades();
        let cheapest = null;
        for (const id of Object.keys(possible_upgrades)) {
            const possible_upgrade = possible_upgrades[id];
            if (cheapest === null
                || possible_upgrade.cost < cheapest.cost
                // Prefer upgrades that are lower level (just to make it consistent)
                || (possible_upgrade.cost == cheapest.cost && possible_upgrade.level < cheapest.level)) {
                cheapest = possible_upgrade;
            }
        }
        return cheapest;
    }
    getMostExpensiveUpgrade(max_cost = Game.game_state.resources.money.value()) {
        const possible_upgrades = this.upgrade_tree.getPossibleUpgrades();
        let most_expensive = null;
        for (const id of Object.keys(possible_upgrades)) {
            const possible_upgrade = possible_upgrades[id];
            if (possible_upgrade.cost <= max_cost &&
                (most_expensive === null || possible_upgrade.cost > most_expensive.cost)) {
                most_expensive = possible_upgrade;
            }
        }
        return most_expensive;
    }
    generateLabel(upgrade_id, possible_upgrade) {
        const current_level = this.upgrade_tree.getUpgradeLevel(upgrade_id);
        const amount = possible_upgrade.level - current_level;
        const name = UPGRADE_OPTIONS[upgrade_id].name;
        const max = UPGRADE_OPTIONS[upgrade_id].max_level === Infinity ? "∞" : UPGRADE_OPTIONS[upgrade_id].max_level;
        return `${name} x${amount} (${current_level}→${possible_upgrade.level}/${max}) - $${possible_upgrade.cost}`;
    }
    generateUpgradeMenuOption(upgrade_id, slider_value) {
        const current_level = this.upgrade_tree.getUpgradeLevel(upgrade_id);
        const upgrade = UPGRADES[upgrade_id];
        let possible_upgrade;
        let disabled = false;
        const max_upgrade = upgrade.getMaxPurchaseable(current_level, Game.game_state.resources.money.value());
        if (max_upgrade === null) {
            possible_upgrade = { level: current_level + 1, cost: upgrade.getCost(current_level + 1), id: upgrade_id };
            ;
            disabled = true;
        }
        else {
            const max_amount = max_upgrade.level - current_level;
            const amount = Math.max(1, Math.floor(max_amount * slider_value));
            const cost = UPGRADES[upgrade_id].getCostRange(current_level + 1, current_level + amount);
            possible_upgrade = { level: current_level + amount, cost: cost, id: upgrade_id };
        }
        return {
            label: this.generateLabel(upgrade_id, possible_upgrade),
            description: UPGRADE_OPTIONS[upgrade_id].description,
            callback: () => this.applyUpgrade(possible_upgrade),
            sliderCallback: (new_slider_value) => {
                return this.generateUpgradeMenuOption(upgrade_id, new_slider_value);
            },
            disabled: disabled,
            preventCloseOnClick: disabled,
        };
    }
    getUpgradeMenuItems(slider_value) {
        let ret = [];
        for (const upgrade_id of this.upgrade_tree.getUnlockedIds()) {
            ret.push(this.generateUpgradeMenuOption(upgrade_id, slider_value));
        }
        return ret;
    }
    updatePlaybackRate() {
        const level = this.upgrade_tree.getUpgradeLevel("playback_speed");
        this.playback_rate = Math.pow(2, level);
        this.animation.updatePlaybackRate(this.playback_rate);
    }
    applyUpgrade(possible_upgrade) {
        Game.purchase(possible_upgrade);
        const id = possible_upgrade.id;
        const current_level = this.upgrade_tree.getUpgradeLevel(id);
        this.upgrade_tree.applyUpgrade(id, possible_upgrade);
        if (id == "playback_speed") {
            this.updatePlaybackRate();
        }
        this.addUpgradeGraphic(id, possible_upgrade.level);
    }
    addConnectorGraphic() {
        const use = document.createElementNS(SVG_NS, "use");
        use.setAttribute("href", "#connectAdjacent");
        use.setAttribute("x", "0");
        use.setAttribute("y", "0");
        use.setAttribute("width", "100%");
        use.setAttribute("height", "100%");
        this.svg_element.insertBefore(use, this.svg_element.firstChild);
    }
    addPlaybackSpeedGraphic(applied_level, new_level) {
        for (let i = applied_level + 1; i <= new_level; i++) {
            const offset = 5 * i;
            const use = document.createElementNS(SVG_NS, "use");
            use.classList.add("playback-speed-chevron");
            use.setAttribute("href", "#chevron");
            use.setAttribute("x", `${90 - offset}%`);
            use.setAttribute("y", "90%");
            use.setAttribute("width", "10%");
            use.setAttribute("height", "10%");
            this.svg_element.appendChild(use);
        }
    }
    addMoneyUpgradeGraphic(applied_level, new_level) {
        for (let i = applied_level + 1; i <= new_level; i++) {
            const offset = 4 * i;
            const use = document.createElementNS(SVG_NS, "use");
            use.classList.add("money-chevron");
            use.setAttribute("href", "#chevron");
            use.setAttribute("x", "90%");
            use.setAttribute("y", `${offset}%`);
            use.setAttribute("width", "10%");
            use.setAttribute("height", "10%");
            this.svg_element.appendChild(use);
        }
    }
    addUpgradeGraphic(id, new_level) {
        var _a, _b;
        const applied_level = (_b = (_a = this.upgrade_graphics_state[id]) === null || _a === void 0 ? void 0 : _a.applied_level) !== null && _b !== void 0 ? _b : 0;
        const max_graphics_level = UPGRADE_OPTIONS[id].max_graphics_level;
        if (applied_level >= max_graphics_level || new_level === 0) {
            return;
        }
        new_level = Math.min(new_level, max_graphics_level);
        if (id === "playback_speed") {
            this.addPlaybackSpeedGraphic(applied_level, new_level);
        }
        else if (id === "advance_adjacent") {
            this.addConnectorGraphic();
        }
        else if (id === "applications_per_cycle") {
            // TODO: Add some sort of visual to the svg
        }
        else if (id === "money_per_application") {
            this.addMoneyUpgradeGraphic(applied_level, new_level);
        }
        this.upgrade_graphics_state[id] = { applied_level: new_level };
    }
    reapplyUpgradeGraphics() {
        this.upgrade_graphics_state = {};
        for (const id of this.upgrade_tree.getUnlockedIds()) {
            if (this.upgrade_tree.getUpgradeLevel(id) > 0) {
                this.addUpgradeGraphic(id, this.upgrade_tree.getUpgradeLevel(id));
            }
        }
        for (const id of this.upgrade_tree.getMaxedIds()) {
            this.addUpgradeGraphic(id, UPGRADE_OPTIONS[id].max_graphics_level);
        }
    }
    tick() {
        tickLog === null || tickLog === void 0 ? void 0 : tickLog("tick from " + this.toString());
    }
    reset() {
        this.animation.currentTime = 0;
    }
    tickAndReset() {
        this.animate();
        this.tick();
    }
    animate() {
        if (this.animation) {
            this.animation.cancel();
        }
        this.animation = this.mask_circle.animate(clock_background_keyframes, clock_background_timing);
        this.animation.updatePlaybackRate(this.playback_rate);
        this.animation.addEventListener("finish", () => this.tickAndReset());
        if (__classPrivateFieldGet(this, _Clock_paused, "f")) {
            this.animation.pause();
        }
    }
    // Advance the animation by the given amount of unscaled time (milliseconds)
    // TODO: implement handling more than one tick if needed
    // TODO?: make it happen smoothly -- maybe by increasing the playback rate temporarily
    //        or show some other sort of feedback
    advanceByUnscaled(amount) {
        if (!this.animation)
            return;
        if (!this.animation.currentTime) {
            this.animation.currentTime = 0;
        }
        if (amount >= this.unscaledRemainingTime()) {
            amount -= this.unscaledRemainingTime();
            this.tickAndReset();
        }
        this.animation.currentTime += amount;
    }
    advanceByScaled(amount) {
        this.advanceByUnscaled(amount * this.playback_rate);
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
    unscaledRemainingTime() {
        if (!this.animation || !this.animation.currentTime) {
            return this.unscaledDuration();
        }
        return this.unscaledDuration() - this.animation.currentTime;
    }
    // Returns real time remaining
    remainingTime() {
        var _a;
        if (!this.animation) {
            return TEN_SECONDS;
        }
        const speed = (_a = this.animation.playbackRate) !== null && _a !== void 0 ? _a : 1;
        return this.unscaledRemainingTime() / speed;
    }
    toString() {
        return this.getType() + " at " + this.options.position.toString();
    }
    getOpCount() {
        return 1;
    }
    addPauseGraphic() {
        const use = document.createElementNS(SVG_NS, "use");
        use.classList.add("pauseSign");
        use.setAttribute("href", "#pauseSign");
        use.setAttribute("x", "0");
        use.setAttribute("y", "0");
        use.setAttribute("width", "10%");
        use.setAttribute("height", "10%");
        this.pause_element = use;
        this.svg_element.appendChild(use);
    }
    pause(manual = true) {
        if (manual && !this.manually_paused) {
            this.manually_paused = true;
            this.addPauseGraphic();
        }
        __classPrivateFieldSet(this, _Clock_paused, true, "f");
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
        return __classPrivateFieldGet(this, _Clock_paused, "f");
    }
    unpause() {
        if (this.animation) {
            this.animation.play();
        }
        this.manually_paused = false;
        __classPrivateFieldSet(this, _Clock_paused, false, "f");
        if (this.pause_element) {
            this.pause_element.remove();
            this.pause_element = null;
        }
    }
    refund() {
        var _a;
        (_a = this.animation) === null || _a === void 0 ? void 0 : _a.cancel();
        Game.game_state.resources.money.add(this.upgrade_tree.getRefundAmount());
        this.upgrade_tree.reset();
    }
}
_Clock_paused = new WeakMap();
class ProducerClock extends Clock {
    tick() {
        super.tick();
        const op_count = this.getOpCount();
        const money_multiplier = this.getMoneyMultiplier();
        const applied_ops = Game.applyOps(op_count, money_multiplier);
        const success = applied_ops > 0;
        if (success) {
            this.advanceAdjacent();
        }
        // TODO: animate the cell multiple times, or show a different color based on ratio 
        // of applied ops to requested ops.
        // Or just chose number of sucessful and failed ops in the cell somewhere
        Game.table_view.animateCellSuccess(this.options.position, success);
    }
    getOpCount() {
        return 1 + this.upgrade_tree.getUpgradeLevel("applications_per_cycle");
    }
    getMoneyMultiplier() {
        return 1 << this.upgrade_tree.getUpgradeLevel("money_per_application");
    }
    advanceAdjacent() {
        const upgrade_level = this.upgrade_tree.getUpgradeLevel("advance_adjacent");
        if (upgrade_level <= 0) {
            return;
        }
        const nearby = Game.table_view.getAdjacentClocks(this.options.position);
        for (const clock of nearby) {
            if (!clock.manually_paused) {
                clock.advanceByUnscaled(upgrade_level * ADVANCE_ADJACENT_AMOUNT);
            }
        }
    }
}
ProducerClock.clockType = "Producer";
class VerifierClock extends Clock {
    tick() {
        super.tick();
        const success = Game.verify();
        Game.table_view.animateCellSuccess(this.options.position, success);
    }
}
VerifierClock.clockType = "Verifier";
class ReferenceClock extends Clock {
    constructor(game, options) {
        super(options);
        this.last_tick = 0;
        this.last_tick = performance.now();
        this.attachClock();
        this.animate();
    }
    tick() {
        super.tick();
        if (!this.last_tick) {
            tickLog === null || tickLog === void 0 ? void 0 : tickLog("Reference clock ticked. First tick");
            this.last_tick = performance.now();
        }
        else {
            const now = performance.now();
            const delta = now - this.last_tick;
            this.last_tick = now;
            tickLog === null || tickLog === void 0 ? void 0 : tickLog("Reference clock ticked. Delta: " + delta);
        }
    }
    attachClock() {
        // Copying this from table view for now
        let s = document.createElementNS(SVG_NS, "svg");
        s.classList.add("clock");
        s.classList.add(this.getType());
        let timer_background = document.createElementNS(SVG_NS, "circle");
        timer_background.classList.add("clock-mask");
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
ReferenceClock.clockType = "Reference";
