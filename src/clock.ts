var tickLog: Logger | undefined;
// tickLog = console.log;

class Position {
    constructor(public row: number, public col: number) { }

    saveState(): PositionSaveState {
        return { row: this.row, col: this.col };
    }

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
type ClockTypeSet = {
    [U in ClockType]?: boolean;
}

interface ClockOptions {
    type: ClockType;
    position: Position;
    offset?: number;
}

type UpgradeGraphicsState = {
    [U in UpgradeId]?: {applied_level: number};
};

abstract class Clock {


    static readonly clockType: ClockType;

    animation?: Animation;
    // SVG Element this clock is displayed in
    svg_element: SVGSVGElement;
    // SVG Element used to display progress for this clock
    mask_circle: SVGCircleElement;
    // SVG Element to show applications_per_cycle level
    applications_per_cycle_text: SVGTextElement;
    pause_element: SVGUseElement | null;
    upgrade_graphics_state: UpgradeGraphicsState;
    playback_rate: number = 1;

    // When updating offline, avoid updating the clock's animation time
    pending_animation_time: number  = 0;
    adjacent_ticks_on_most_recent_tick: Clock[] = [];

    #paused: boolean = false;
    manually_paused: boolean = false;
    // TODO: keep track of money spent on upgrades -- maybe in the upgrade tree?
    upgrade_tree: UpgradeTree;


    constructor(public options: ClockOptions) { 
        this.upgrade_tree = new UpgradeTree(new.target.clockType);
        this.upgrade_graphics_state = {};
    }

    saveState(): ClockSaveState {
        return {
            type: this.getType(),
            position: this.options.position.saveState(),
            upgrades: this.upgrade_tree.saveState(),
            time: this.animation?.currentTime ?? 0,
        };
    }

    restoreFrom(state: ClockSaveState) {
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

    getType(): ClockType {
        // Ugly, but doesn't seem to be another way to refer to a static member polymorphically
        return (this.constructor as typeof Clock).clockType;
    }
    

    getPossibleUpgrades(): PossibleUpgrades {
        return this.upgrade_tree.getPossibleUpgrades();
    }

    getMaxPossibleUpgrades(currency: number): PossibleUpgrades {
        return this.upgrade_tree.getMaxPossibleUpgrades(currency);
    }

    getCheapestUpgrade(): PossibleUpgradeState | null {
        const possible_upgrades = this.upgrade_tree.getPossibleUpgrades();
        let cheapest: PossibleUpgradeState | null = null;
        for (const id of upgradeIds(possible_upgrades)) {
            const possible_upgrade = possible_upgrades[id]!;
            if (cheapest === null 
                || possible_upgrade.cost < cheapest.cost 
                // Prefer upgrades that are lower level (just to make it consistent)
                || (possible_upgrade.cost == cheapest.cost &&  possible_upgrade.level < cheapest.level)) {
                cheapest = possible_upgrade;
            }
        }
        return cheapest;
    }

    getMostExpensiveUpgrade(max_cost: number = Game.game_state.resources.money.value()): PossibleUpgradeState | null {
        const possible_upgrades = this.upgrade_tree.getPossibleUpgrades();
        let most_expensive: PossibleUpgradeState | null = null;
        for (const id of upgradeIds(possible_upgrades)) {
            const possible_upgrade = possible_upgrades[id]!;
            if (possible_upgrade.cost <= max_cost && 
                    (most_expensive === null || possible_upgrade.cost > most_expensive.cost)) {
                most_expensive = possible_upgrade;
            }
        }
        return most_expensive;
    }

    generateLabel(upgrade_id: UpgradeId,  possible_upgrade: PossibleUpgradeState): string {
        const current_level = this.upgrade_tree.getUpgradeLevel(upgrade_id); 
        const amount = possible_upgrade.level - current_level;
        const name = UPGRADE_OPTIONS[upgrade_id].name;
        const max = UPGRADE_OPTIONS[upgrade_id].max_level === Infinity ? "∞" : UPGRADE_OPTIONS[upgrade_id].max_level;
        return `${name} x${amount} (${current_level}→${possible_upgrade.level}/${max}) - $${possible_upgrade.cost}`;
    }

    generateUpgradeMenuOption(upgrade_id: UpgradeId, slider_value: number): MenuOption {
        const current_level = this.upgrade_tree.getUpgradeLevel(upgrade_id);
        const upgrade = UPGRADES[upgrade_id];
        let possible_upgrade;
        let disabled = false;
        const max_upgrade = upgrade.getMaxPurchaseable(current_level, Game.game_state.resources.money.value());
        if (max_upgrade === null) {
            possible_upgrade = {level: current_level+1, cost: upgrade.getCost(current_level+1), id: upgrade_id};;
            disabled = true;
        } else {
            const max_amount = max_upgrade.level - current_level;
            const amount = Math.max(1, Math.floor(max_amount * slider_value));
            const cost = UPGRADES[upgrade_id].getCostRange(current_level+1, current_level + amount);
            possible_upgrade = {level: current_level + amount, cost: cost, id: upgrade_id};
        }
        return {
            label: this.generateLabel(upgrade_id, possible_upgrade),
            description: UPGRADE_OPTIONS[upgrade_id].description,
            callback: () => this.applyUpgrade(possible_upgrade),
            sliderCallback: (new_slider_value: number) => {
                return this.generateUpgradeMenuOption(upgrade_id, new_slider_value);
            },
            disabled: disabled,
            preventCloseOnClick: disabled,
        };
    }

    generateSinglyLockedUpgradeMenuOption(upgrade_id: UpgradeId): MenuOption {
        // Show an option with the upgrade name and unlock requirements
        const upgrade_options = UPGRADE_OPTIONS[upgrade_id];
        const sources: UpgradeStateMap = {};
        if (!('unlocked_by' in upgrade_options)) {
            throw new Error("Upgrade is locked and has no way to be unlocked.");
        }
        const unlocked_by = upgrade_options.unlocked_by!;
        for (const source_id of upgradeIds(unlocked_by)) {
            if (this.getType() in UPGRADE_OPTIONS[source_id].applies_to
                && this.upgrade_tree.hasUnlocked(source_id)) {
                sources[source_id] = {level: unlocked_by[source_id]!};
            }
        }
        let label = upgrade_options.name + ' - Unlocked at "';
        for (const source_id of upgradeIds(sources)) {
            const source = sources[source_id]!;
            const source_options = UPGRADE_OPTIONS[source_id];
            label += `${source_options.name}" level ${source.level} or "`;
        }
        label = label.slice(0, -5);
        return {
            label: label,
            description: upgrade_options.description,
            callback: () => {},
            disabled: true,
        };
    }

    generateDoublyLockedUpgradeMenuOption(upgrade_id: UpgradeId): MenuOption {
        const upgrade_options = UPGRADE_OPTIONS[upgrade_id];
        const sources: UpgradeStateMap = {};
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

    generateMaxedUpgradeMenuOption(upgrade_id: UpgradeId): MenuOption {

        const upgrade_options = UPGRADE_OPTIONS[upgrade_id];
        return {
            label: `${upgrade_options.name} fully upgraded (${upgrade_options.max_level}/${upgrade_options.max_level})`,
            description: upgrade_options.description,
            callback: () => {},
            disabled: true,
        };
    }

    getUpgradeMenuItems(slider_value: number): MenuItem[] {
        const ret: MenuItem[] = [];
        let need_sep = false;

        const addSepIfNeeded = () => {
            if (need_sep) { 
                ret.push("hr");
                need_sep = false;
            }
        }

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
        this.playback_rate = 2 ** level;
        this.animation!.updatePlaybackRate(this.playback_rate);
    }


    applyUpgrade(possible_upgrade: PossibleUpgradeState) {
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

    addPlaybackSpeedGraphic(applied_level: number, new_level:number) {
        for (let i = applied_level + 1; i <= new_level; i++) {
            const offset = 5 * i;
            const use = document.createElementNS(SVG_NS, "use");
            use.classList.add("playback-speed-chevron");
            use.setAttribute("href", "#chevron");
            use.setAttribute("x", `${90-offset}%`);
            use.setAttribute("y", "90%");
            use.setAttribute("width", "10%");
            use.setAttribute("height", "10%");
            this.svg_element.appendChild(use);
        }
    }

    addMoneyUpgradeGraphic(applied_level: number, new_level: number) {
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

    addApplicationsPerCycleUpgradeGraphic(applied_level: number, new_level: number) {
        if (applied_level == 0) {
            const text = document.createElementNS(SVG_NS, "text");
            text.classList.add("applications-per-cycle-text");
            text.setAttribute("x", "85%");
            text.setAttribute("y", "50%");
            text.setAttribute("font-size", `${100 * OptionsMenu.cell_size / 52}%`);
            this.svg_element.appendChild(text);
            this.applications_per_cycle_text = text;

        }
        this.applications_per_cycle_text!.textContent = new_level.toString();
    }
    updateApplicationsPerCycleFontSize() {
        if (this.applications_per_cycle_text) {
            this.applications_per_cycle_text.setAttribute("font-size", `${100 * OptionsMenu.cell_size / 52}%`);
        }
    }

    addUpgradeGraphic(id: UpgradeId, new_level: number) {
        const applied_level = this.upgrade_graphics_state[id]?.applied_level ?? 0;
        const max_graphics_level = UPGRADE_OPTIONS[id].max_graphics_level;
        if (applied_level >= max_graphics_level || new_level === 0) {
            return;
        }
        new_level = Math.min(new_level, max_graphics_level);
        if (id === "playback_speed") {
            this.addPlaybackSpeedGraphic(applied_level, new_level);
        } else if (id === "advance_adjacent") {
            this.addConnectorGraphic();
        } else if (id === "applications_per_cycle") {
            this.addApplicationsPerCycleUpgradeGraphic(applied_level, new_level);
        } else if (id === "money_per_application") {
            this.addMoneyUpgradeGraphic(applied_level, new_level);
        }
        this.upgrade_graphics_state[id] = {applied_level: new_level};
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

    tick(offline: boolean = false) {
        tickLog?.("tick from " + this.toString());
        this.pending_animation_time = 0;
    }

    reset() {
        this.animation!.currentTime = 0;
    }

    tickAndReset(offline: boolean = false) {
        if (!offline) {
            this.animate();
        } else if (this.animation?.currentTime !== 0) {
            this.animation!.currentTime = 0;
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
        if (this.#paused) {
            this.animation.pause();
        }

    }

    // Advance the animation by the given amount of unscaled time (milliseconds)
    // TODO: implement handling more than one tick if needed
    // TODO?: make it happen smoothly -- maybe by increasing the playback rate temporarily
    //        or show some other sort of feedback
    // Returns whether this caused a tick
    advanceByUnscaled(amount: number, offline: boolean = false) {
        if (!this.animation) return;
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
        } else {
            this.animation.currentTime += amount + this.pending_animation_time;
            this.pending_animation_time = 0;
            this.animateAdvance(full_amount, before);
        }
        return ticked;
    }

    animateAdvance(amount:number, start: number) {
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
        }
    }

    getSegmentDashOffset(amount: number, start: number) {
        const end = this.animation!.currentTime!;
        const length = (amount / TEN_SECONDS) * Math.PI * 50;
        if (end < start) {
            return ((amount - end) / TEN_SECONDS) * Math.PI * 50 + "%";
        } else {
            return -(start / TEN_SECONDS) * Math.PI * 50 + "%";
        }
    }

    getSegmentDasharray(amount:number, start: number) {
        let end = this.animation!.currentTime!;
        const length = ((amount / TEN_SECONDS) * Math.PI).toFixed(2);
        
        if (end < start) {
            // 157 = 50 * 3.14
            return `calc(50% * ${length}) calc(157% - (50% * ${length}))`;
        } else {
            return `calc(50% * ${length}) 500%`;
        }
    }

    advanceByScaled(amount: number, offline: boolean = false) {
        this.advanceByUnscaled(amount * this.playback_rate, offline);
    }

    // Returns the unscaled duration of the animation
    unscaledDuration(): number {
        return clock_background_timing.duration;
    }

    // Returns the real duration of the animation
    scaledDuration(): number {
        if (!this.animation) {
            return TEN_SECONDS;
        }
        return this.unscaledDuration() / (this.animation!.playbackRate ?? 1);
    }

    unscaledRemainingTime(): number {
        if (!this.animation || !this.animation.currentTime) {
            return this.unscaledDuration() - this.pending_animation_time;
        }
        return this.unscaledDuration() - (this.animation.currentTime + this.pending_animation_time);
    }

    // Returns real time remaining
    remainingTime(): number {
        if (!this.animation) {
            return TEN_SECONDS;
        }
        const speed = this.animation.playbackRate ?? 1;
        return this.unscaledRemainingTime() / speed;
    }

    toString(): string {
        return this.getType() + " at " + this.options.position.toString();
    }

    getOpCount(): number {
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

    pause(manual: boolean = true) {
        if (manual && !this.manually_paused) {
            this.manually_paused = true;
            this.addPauseGraphic();
        }
        this.#paused = true;
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
        return this.#paused;
    }

    unpause() {
        if (this.animation) {
            this.animation.play();
        }
        this.manually_paused = false;
        this.#paused = false;
        if (this.pause_element) {
            this.pause_element.remove();
            this.pause_element = null;
        }
    }

    refundAmount() {
        return this.upgrade_tree.getRefundAmount();
    }
    refund() {
        this.animation?.cancel();
        Game.game_state.resources.money.add(this.refundAmount());
        this.upgrade_tree.reset();
    }

}

class ProducerClock extends Clock {
    static readonly clockType = "Producer";

    tick(offline: boolean = false) {
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

    getOpCount(): number {
        return 1 + this.upgrade_tree.getUpgradeLevel("applications_per_cycle");
    }

    getMoneyMultiplier(): number {
        return 1 << this.upgrade_tree.getUpgradeLevel("money_per_application");
    }
    
    advanceAdjacent(offline: boolean = false) {
        const upgrade_level = this.upgrade_tree.getUpgradeLevel("advance_adjacent");
        if (upgrade_level <= 0) { return;}
        const nearby = Game.table_view.getAdjacentClocks(this.options.position);
        for (const clock of nearby) {
            if (!clock.manually_paused) {
                if(clock.advanceByUnscaled(upgrade_level * ADVANCE_ADJACENT_AMOUNT, offline)) {
                    this.adjacent_ticks_on_most_recent_tick.push(clock);
                }
            }
        }
    }


}

class VerifierClock extends Clock {
    static readonly clockType = "Verifier";

    tick(offline: boolean = false) {
        super.tick(offline);
        const success = Game.verify();
        if (!offline) {
            Game.table_view.animateCellSuccess(this.options.position, success);
        }
    }

}

class ReferenceClock extends Clock {
    static readonly clockType = "Reference";

    last_tick: number = 0;

    circle: SVGCircleElement;


    constructor(game: Game, options: ClockOptions) {
        super(options);
        this.last_tick = performance.now();
        this.attachClock();
        this.animate();
    }

    tick(offline: boolean = false) {
        super.tick(offline);
        if (!this.last_tick) {
            tickLog?.("Reference clock ticked. First tick");
            this.last_tick = performance.now();
        } else {
            const now = performance.now();
            const delta = now - this.last_tick;
            this.last_tick = now;
            tickLog?.("Reference clock ticked. Delta: " + delta);
        }
    }

    attachClock() {
        // Copying this from table view for now
        let s = document.createElementNS(SVG_NS, "svg") as SVGSVGElement;
        s.classList.add("clock");
        s.classList.add(this.getType());

        let timer_background = document.createElementNS(SVG_NS, "circle") as SVGCircleElement;
        timer_background.classList.add("clock-mask");
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

    unscaledDuration(): number {
        return reference_clock_timing.duration;
    }

}