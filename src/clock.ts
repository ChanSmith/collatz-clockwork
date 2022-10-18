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
    pause_element: SVGUseElement | null;
    upgrade_graphics_state: UpgradeGraphicsState;
    playback_rate: number = 1;

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
        for (const id of Object.keys(possible_upgrades)) {
            const possible_upgrade = possible_upgrades[id];
            if (cheapest === null 
                || possible_upgrade.cost < cheapest.cost 
                // Prefer upgrades that are lower level (just to make it consistent)
                || (possible_upgrade.cost == cheapest.cost &&  possible_upgrade.level < cheapest.level)) {
                cheapest = possible_upgrade;
            }
        }
        return cheapest;
    }

    getMostExpensiveUpgrade(): PossibleUpgradeState | null {
        const possible_upgrades = this.upgrade_tree.getPossibleUpgrades();
        let most_expensive: PossibleUpgradeState | null = null;
        for (const id of Object.keys(possible_upgrades)) {
            const possible_upgrade = possible_upgrades[id];
            if (most_expensive === null || possible_upgrade.cost > most_expensive.cost) {
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

    getUpgradeMenuItems(slider_value: number): MenuItem[] {
        let ret: MenuItem[] = [];
        for (const upgrade_id of this.upgrade_tree.getUnlockedIds()) {
            ret.push(this.generateUpgradeMenuOption(upgrade_id, slider_value));
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

    addUpgradeGraphic(id: UpgradeId, new_level: number) {
        const applied_level = this.upgrade_graphics_state[id]?.applied_level ?? 0;
        const max_graphics_level = UPGRADE_OPTIONS[id].max_graphics_level;
        if (applied_level >= max_graphics_level) {
            return;
        }
        new_level = Math.min(new_level, max_graphics_level);
        if (id === "playback_speed") {
            this.addPlaybackSpeedGraphic(applied_level, new_level);
        } else if (id === "advance_adjacent") {
            this.addConnectorGraphic();
        } else if (id === "applications_per_cycle") {
            // TODO: Add some sort of visual to the svg
        } else if (id === "money_per_application") {
            this.addMoneyUpgradeGraphic(applied_level, new_level);
        }
        this.upgrade_graphics_state[id] = {applied_level: new_level};
    }

    reapplyUpgradeGraphics() {
        this.upgrade_graphics_state = {};
        for (const id of this.upgrade_tree.getUnlockedIds()) {
            this.addUpgradeGraphic(id, this.upgrade_tree.getUpgradeLevel(id));
        }
        for (const id of this.upgrade_tree.getMaxedIds()) {
            this.addUpgradeGraphic(id, UPGRADE_OPTIONS[id].max_graphics_level);
        }
    }

    tick() {
        tickLog?.("tick from " + this.toString());
    }

    reset() {
        this.animation!.currentTime = 0;
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
        if (this.#paused) {
            this.animation.pause();
        }

    }

    // Advance the animation by the given amount of unscaled time (milliseconds)
    // TODO: implement handling more than one tick if needed
    // TODO?: make it happen smoothly -- maybe by increasing the playback rate temporarily
    //        or show some other sort of feedback
    advanceByUnscaled(amount: number) {
        if (!this.animation) return;
        if (!this.animation.currentTime) {
            this.animation.currentTime = 0;
        }
        if (amount >= this.unscaledRemainingTime()) {
            amount -= this.unscaledRemainingTime();
            this.tickAndReset();
        }
        this.animation.currentTime += amount;
    }

    advanceByScaled(amount: number) {
        this.advanceByUnscaled(amount * this.playback_rate);
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
            return this.unscaledDuration();
        }
        return this.unscaledDuration() - this.animation.currentTime;
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

    refund() {
        Game.game_state.resources.money.add(this.upgrade_tree.getRefundAmount());
        this.upgrade_tree.reset();
    }

}

class ProducerClock extends Clock {
    static readonly clockType = "Producer";

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

    getOpCount(): number {
        return 1 + this.upgrade_tree.getUpgradeLevel("applications_per_cycle");
    }

    getMoneyMultiplier(): number {
        return 1 << this.upgrade_tree.getUpgradeLevel("money_per_application");
    }

    advanceAdjacent() {
        const upgrade_level = this.upgrade_tree.getUpgradeLevel("advance_adjacent");
        if (upgrade_level <= 0) { return;}
        const nearby = Game.table_view.getAdjacentClocks(this.options.position);
        for (const clock of nearby) {
            if (!clock.manually_paused) {
                clock.advanceByUnscaled(upgrade_level * ADVANCE_ADJACENT_AMOUNT);
            }
        }
    }


}

class VerifierClock extends Clock {
    static readonly clockType = "Verifier";

    tick() {
        super.tick();
        const success = Game.verify();
        Game.table_view.animateCellSuccess(this.options.position, success);
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

    tick() {
        super.tick();
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