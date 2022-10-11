var tickLog: Logger | undefined;
// tickLog = console.log;
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
type ClockTypeSet = {
    [U in ClockType]?: boolean;
}

interface ClockOptions {
    type: ClockType;
    position: Position;
}

class UpgradeInfo {

}

abstract class Clock {

    static readonly clockType: ClockType;

    animation?: Animation;

    manually_paused: boolean = false;
    upgrade_tree: UpgradeTree;


    constructor(public options: ClockOptions) { 
        this.upgrade_tree = new UpgradeTree(new.target.clockType);
    }

    getType(): ClockType {
        // Ugly, but doesn't seem to be another way to refer to a static member polymorphically
        return (this.constructor as typeof Clock).clockType;
    }

    getPossibleUpgrades(): PossibleUpgrades {
        return this.upgrade_tree.getPossibleUpgrades();
    }

    getUpgradeMenuItems(): MenuItem[] {
        let ret: MenuItem[] = [];
        const possible_upgrades = this.getPossibleUpgrades();
        for (const upgrade_id of upgradeIds(possible_upgrades)) {
            const possible_upgrade = possible_upgrades[upgrade_id]!;
            const upgrade  = UPGRADES_OPTIONS[upgrade_id];
            const new_level = possible_upgrade.level;
            const cost = possible_upgrade.cost;
            const disabled = !Game.canPurchase(possible_upgrade);
            let level_label: string;
            if (upgrade.max_level !== Infinity) {
                level_label = " (" + new_level + " / " + upgrade.max_level + ")";
            } else {
                level_label = " (" + new_level + " / ∞)";
            }
            ret.push( {
                label: upgrade.name + " $" + cost + level_label,
                callback: () => this.applyUpgrade(upgrade_id, possible_upgrade),
                disabled: disabled,
                preventCloseOnClick: disabled,
            });
        }
        // TODO: show locked ones with requirement
        return ret;
    }

    applyUpgrade(key: UpgradeId, possible_upgrade: PossibleUpgradeState) {
        Game.purchase(possible_upgrade);
        this.upgrade_tree.applyUpgrade(key, possible_upgrade);
        if (key == "playback_speed") {
            this.animation!.updatePlaybackRate(2 ** possible_upgrade.level);
        }
    }

    tick() {
        tickLog?.("tick from " + this.toString());
    }

    reset() {
        this.animation!.currentTime = 0;
    }

    tickAndReset() {
        this.tick();
        this.reset();
    }

    // Advance the animation by the given amount of real time (milliseconds)
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
        this.animation.currentTime += (amount * (this.animation.playbackRate ?? 1));
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

    // Returns real time remaining
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
    static readonly clockType = "Producer";

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

    getOpCount(): number {
        return 1 + this.upgrade_tree.getUpgradeLevel("applications_per_cycle");
    }

    advanceNearby() {
        const upgrade_level = this.upgrade_tree.getUpgradeLevel("advance_nearby");
        if (upgrade_level <= 0) { return;}
        const nearby = Game.table_view.getNearbyClocks(this.options.position);
        for (const clock of nearby) {
            clock.advanceBy(upgrade_level * ADVANCE_NEARBY_AMOUNT);
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

    unscaledDuration(): number {
        return reference_clock_timing.duration;
    }

}