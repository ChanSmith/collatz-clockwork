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
        // When updating offline, avoid updating the clock's animation time
        this.pending_animation_time = 0;
        this.adjacent_ticks_on_most_recent_tick = [];
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
        for (const upgrade_id of this.upgrade_tree.getMaxedIds()) {
            this.addUpgradeGraphic(upgrade_id, UPGRADE_OPTIONS[upgrade_id].max_level);
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
        for (const id of upgradeIds(possible_upgrades)) {
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
        for (const id of upgradeIds(possible_upgrades)) {
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
        const max = UPGRADE_OPTIONS[upgrade_id].max_level === Infinity ? "???" : UPGRADE_OPTIONS[upgrade_id].max_level;
        return `${name} x${amount} (${current_level}???${possible_upgrade.level}/${max}) - $${possible_upgrade.cost}`;
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
    generateSinglyLockedUpgradeMenuOption(upgrade_id) {
        // Show an option with the upgrade name and unlock requirements
        const upgrade_options = UPGRADE_OPTIONS[upgrade_id];
        const sources = {};
        if (!('unlocked_by' in upgrade_options)) {
            throw new Error("Upgrade is locked and has no way to be unlocked.");
        }
        const unlocked_by = upgrade_options.unlocked_by;
        for (const source_id of upgradeIds(unlocked_by)) {
            if (this.getType() in UPGRADE_OPTIONS[source_id].applies_to
                && this.upgrade_tree.hasUnlocked(source_id)) {
                sources[source_id] = { level: unlocked_by[source_id] };
            }
        }
        let label = upgrade_options.name + ' - Unlocked at "';
        for (const source_id of upgradeIds(sources)) {
            const source = sources[source_id];
            const source_options = UPGRADE_OPTIONS[source_id];
            label += `${source_options.name}" level ${source.level} or "`;
        }
        label = label.slice(0, -5);
        return {
            label: label,
            description: upgrade_options.description,
            callback: () => { },
            disabled: true,
        };
    }
    generateDoublyLockedUpgradeMenuOption(upgrade_id) {
        const upgrade_options = UPGRADE_OPTIONS[upgrade_id];
        const sources = {};
        if (!('unlocked_by' in upgrade_options)) {
            throw new Error("Upgrade is locked and has no way to be unlocked.");
        }
        return {
            label: "??????",
            description: "Unlock more upgrades to reveal this one.",
            callback: () => { },
            disabled: true,
        };
    }
    generateMaxedUpgradeMenuOption(upgrade_id) {
        const upgrade_options = UPGRADE_OPTIONS[upgrade_id];
        return {
            label: `${upgrade_options.name} fully upgraded (${upgrade_options.max_level}/${upgrade_options.max_level})`,
            description: upgrade_options.description,
            callback: () => { },
            disabled: true,
        };
    }
    getUpgradeMenuItems(slider_value) {
        const ret = [];
        let need_sep = false;
        const addSepIfNeeded = () => {
            if (need_sep) {
                ret.push("hr");
                need_sep = false;
            }
        };
        for (const upgrade_id of this.upgrade_tree.getUnlockedIds()) {
            ret.push(this.generateUpgradeMenuOption(upgrade_id, slider_value));
            need_sep = true;
        }
        addSepIfNeeded();
        for (const upgrade_id of this.upgrade_tree.getSinglyLockedIds()) {
            ret.push(this.generateSinglyLockedUpgradeMenuOption(upgrade_id));
            need_sep = true;
        }
        addSepIfNeeded();
        for (const upgrade_id of this.upgrade_tree.getDoublyLockedIds()) {
            ret.push(this.generateDoublyLockedUpgradeMenuOption(upgrade_id));
            need_sep = true;
        }
        addSepIfNeeded();
        for (const upgrade_id of this.upgrade_tree.getMaxedIds()) {
            ret.push(this.generateMaxedUpgradeMenuOption(upgrade_id));
            need_sep = true;
        }
        if (ret.length > 0 && !need_sep) {
            // Added items and separator after them, but then didn't add any more items,
            // so remove the last separator
            ret.pop();
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
    addApplicationsPerCycleUpgradeGraphic(applied_level, new_level) {
        if (applied_level == 0) {
            const text = document.createElementNS(SVG_NS, "text");
            text.classList.add("applications-per-cycle-text");
            text.setAttribute("x", "85%");
            text.setAttribute("y", "50%");
            text.setAttribute("font-size", `${100 * OptionsMenu.cell_size / 52}%`);
            this.svg_element.appendChild(text);
            this.applications_per_cycle_text = text;
        }
        this.applications_per_cycle_text.textContent = new_level.toString();
    }
    updateApplicationsPerCycleFontSize() {
        if (this.applications_per_cycle_text) {
            this.applications_per_cycle_text.setAttribute("font-size", `${100 * OptionsMenu.cell_size / 52}%`);
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
            this.addApplicationsPerCycleUpgradeGraphic(applied_level, new_level);
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
    tick(offline = false) {
        tickLog === null || tickLog === void 0 ? void 0 : tickLog("tick from " + this.toString());
        this.pending_animation_time = 0;
    }
    reset() {
        this.animation.currentTime = 0;
    }
    tickAndReset(offline = false) {
        var _a;
        if (!offline) {
            this.animate();
        }
        else if (((_a = this.animation) === null || _a === void 0 ? void 0 : _a.currentTime) !== 0) {
            this.animation.currentTime = 0;
        }
        this.tick(offline);
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
    // Returns whether this caused a tick
    advanceByUnscaled(amount, offline = false) {
        if (!this.animation)
            return;
        if (!this.animation.currentTime) {
            this.animation.currentTime = 0;
        }
        let ticked = false;
        const before = this.animation.currentTime;
        const full_amount = amount;
        if (amount >= this.unscaledRemainingTime()) {
            amount -= this.unscaledRemainingTime();
            this.tickAndReset(offline);
            ticked = true;
        }
        if (offline) {
            this.pending_animation_time += amount;
        }
        else {
            this.animation.currentTime += amount + this.pending_animation_time;
            this.pending_animation_time = 0;
            this.animateAdvance(full_amount, before);
        }
        return ticked;
    }
    animateAdvance(amount, start) {
        const segment = document.createElementNS(SVG_NS, "circle");
        segment.classList.add("advance-segment");
        segment.setAttribute("cx", "50%");
        segment.setAttribute("cy", "50%");
        segment.setAttribute("r", "25%");
        segment.setAttribute("fill", "none");
        segment.setAttribute("stroke", `url(#segment-gradient-generic) green`);
        segment.setAttribute("stroke-width", "50%");
        segment.setAttribute("stroke-dasharray", this.getSegmentDasharray(amount, start));
        segment.setAttribute("stroke-dashoffset", this.getSegmentDashOffset(amount, start));
        this.svg_element.appendChild(segment);
        const anim = segment.animate(advance_segment_keyframes, advance_segment_timing);
        anim.onfinish = () => {
            segment.remove();
        };
    }
    getSegmentDashOffset(amount, start) {
        const end = this.animation.currentTime;
        const length = (amount / TEN_SECONDS) * Math.PI * 50;
        if (end < start) {
            return ((amount - end) / TEN_SECONDS) * Math.PI * 50 + "%";
        }
        else {
            return -(start / TEN_SECONDS) * Math.PI * 50 + "%";
        }
    }
    getSegmentDasharray(amount, start) {
        let end = this.animation.currentTime;
        const length = ((amount / TEN_SECONDS) * Math.PI).toFixed(2);
        if (end < start) {
            // 157 = 50 * 3.14
            return `calc(50% * ${length}) calc(157% - (50% * ${length}))`;
        }
        else {
            return `calc(50% * ${length}) 500%`;
        }
    }
    advanceByScaled(amount, offline = false) {
        this.advanceByUnscaled(amount * this.playback_rate, offline);
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
            return this.unscaledDuration() - this.pending_animation_time;
        }
        return this.unscaledDuration() - (this.animation.currentTime + this.pending_animation_time);
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
    refundAmount() {
        return this.upgrade_tree.getRefundAmount();
    }
    refund() {
        var _a;
        (_a = this.animation) === null || _a === void 0 ? void 0 : _a.cancel();
        Game.game_state.resources.money.add(this.refundAmount());
        this.upgrade_tree.reset();
    }
}
_Clock_paused = new WeakMap();
class ProducerClock extends Clock {
    tick(offline = false) {
        super.tick(offline);
        const op_count = this.getOpCount();
        const money_multiplier = this.getMoneyMultiplier();
        const applied_ops = Game.applyOps(op_count, money_multiplier);
        const success = applied_ops > 0;
        if (success) {
            this.adjacent_ticks_on_most_recent_tick = [];
            this.advanceAdjacent(offline);
        }
        // TODO: animate the cell multiple times, or show a different color based on ratio 
        // of applied ops to requested ops.
        // Or just chose number of sucessful and failed ops in the cell somewhere
        if (!offline) {
            Game.table_view.animateCellSuccess(this.options.position, success);
        }
    }
    getOpCount() {
        return 1 + this.upgrade_tree.getUpgradeLevel("applications_per_cycle");
    }
    getMoneyMultiplier() {
        return 1 << this.upgrade_tree.getUpgradeLevel("money_per_application");
    }
    advanceAdjacent(offline = false) {
        const upgrade_level = this.upgrade_tree.getUpgradeLevel("advance_adjacent");
        if (upgrade_level <= 0) {
            return;
        }
        const nearby = Game.table_view.getAdjacentClocks(this.options.position);
        for (const clock of nearby) {
            if (!clock.manually_paused) {
                if (clock.advanceByUnscaled(upgrade_level * ADVANCE_ADJACENT_AMOUNT, offline)) {
                    this.adjacent_ticks_on_most_recent_tick.push(clock);
                }
            }
        }
    }
}
ProducerClock.clockType = "Producer";
class VerifierClock extends Clock {
    tick(offline = false) {
        super.tick(offline);
        const success = Game.verify();
        if (!offline) {
            Game.table_view.animateCellSuccess(this.options.position, success);
        }
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
    tick(offline = false) {
        super.tick(offline);
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
