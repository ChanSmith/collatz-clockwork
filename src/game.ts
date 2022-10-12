var logUnpauseInfo: Logger;
// logUnpauseInfo = console.log;

var logFocusChange: Logger;
//  logFocusChange = console.log;

class Game {
    static game_state: GameState;

    static generator: CollatzGenerator;
    static table_view: TableView;
    static clock_manager: ClockManager;
    static click_count: number = 0;

    static pause_time: number = 0;

    static test_achieve: boolean = false;
    static testAchievementUnlocked() {
        return Game.test_achieve;
    }
    constructor() {
        Game.generator = new CollatzGenerator();
        Game.table_view = new TableView();
        Game.clock_manager = new ClockManager();
        Game.game_state = new GameState();

        Game.table_view.addStatistic(Game.game_state.ops);
        Game.table_view.addStatistic(Game.game_state.checking);
        Game.table_view.addStatistic(Game.game_state.n);
    }

    static addRow() {
        Game.table_view.addRow();
    }

    static addColumn() {
        Game.table_view.addColumn();
    }

    static addClock(pos: Position, opts: ClockOptions) {
        Game.table_view.addClock(pos, opts);
    }

    static fillGrid() {
        const rows = Game.table_view.getRows();
        const cols = Game.table_view.getColumns();
        const adding = rows * cols - Game.table_view.clockCount();
        const delay = TEN_SECONDS / adding;
        for (var i = 0; i < rows; i++) {
            for (var j = 0; j < cols; j++) {
                const pos = new Position(i, j);
                if (Game.canAddClock(pos, "Reference")) {
                    const type = Math.random() > 0.25 ? "Producer" : "Verifier"
                    Game.addClock(pos, { type: type, position: pos });
                }
            }
        }
        Game.redistributeTimes();
    }

    // TODO: make this only apply to some clocks?
    static redistributeTimes() {
        const count = Game.table_view.clockCount();
        // Pause all clocks, set time to 0, then unpause on a delay
        Game.pause(true);
        Game.table_view.resetAll();
        const offset = TEN_SECONDS / count;
        var offsetCount = 0;
        for (let i = 0; i < Game.table_view.getRows(); i++) {
            for (let j = 0; j < Game.table_view.getColumns(); j++) {
                const pos = new Position(i, j);
                if (!Game.table_view.canAddClock(pos)) {
                    // TODO: track these and cancel them if another unpause comes in 
                    window.setTimeout(() => {
                        Game.table_view.unpauseClock(pos);
                    }, offset * offsetCount++);
                }
            }
        }
    }

    static canAddClock(pos: Position, type: ClockType) {
        return Game.table_view.canAddClock(pos);
    }


    static  getNewClockMenuItems(pos: Position): Array<MenuItem> {
        let ret: Array<MenuItem> = [];
        if (Game.canAddClock(pos, "Producer")) {
            ret.push({
                label: "Add Producer",
                callback: () => {
                    Game.addClock(pos, { type: "Producer", position: pos });
                }
            });
        }
        if (Game.canAddClock(pos, "Verifier")) {
            ret.push({
                label: "Add Verifier",
                callback: () => {
                    Game.addClock(pos, { type: "Verifier", position: pos });
                }
            });
        }
        return ret;

    }

    static removeClock(pos: Position) {
        Game.table_view.removeClock(pos);
    }

    static getRemoveClockMenuItems(pos: Position): Array<MenuItem> {
        return [
            {
                label: "Remove Clock",
                callback: () => {
                    Game.removeClock(pos);
                }
            }
        ];
    }

    static getPauseClockMenuItems(pos: Position): Array<MenuItem> {
        if (Game.table_view.clockPaused(pos)) {
            return [
                {
                    label: "Unpause Clock",
                    callback: () => {
                        Game.table_view.unpauseClock(pos);
                    }
                }
            ];
        } else {
            return [
                {
                    label: "Pause Clock",
                    callback: () => {
                        Game.table_view.pauseClock(pos);
                    }
                }
            ];
        }
    }

    static getClockUpgradeMenuItems(pos: Position): MenuItem[] {
        const clock = Game.clock_manager.getClock(pos);
        if (clock) {
            return clock.getUpgradeMenuItems();
        }
        return [];
    }

    static primaryMenuItemGenerator(pos: Position): MenuItemGenerator {
        return () => {
            let items: Array<MenuItem> = [];
            if (Game.table_view.canAddClock(pos)) {
                items.push(...Game.getNewClockMenuItems(pos));
            }
            else {
                items.push(...Game.getPauseClockMenuItems(pos));
                items.push("hr");
                items.push(...Game.getClockUpgradeMenuItems(pos));
            }
            return items;
        }
    }

    static secondaryMenuItemGenerator(pos: Position): MenuItemGenerator {
        return () => {
            let items: Array<MenuItem> = [];
            if (!Game.table_view.canAddClock(pos)) {
                items.push(...Game.getRemoveClockMenuItems(pos));
            }
            return items;
        };
    }

    static canPurchase(possible_upgrade: PossibleUpgradeState) {
        return Game.game_state.canPurchase(possible_upgrade);
    }

    static purchase(possible_upgrade: PossibleUpgradeState) {
        Game.game_state.purchase(possible_upgrade);
    }

    static applyOps(amount: number) {
        const seq = Game.generator.getSequence(Game.game_state.n.value(), amount);
        if (seq.length > 0) {
            Game.game_state.applySequence(seq);
            return seq.length;
        }
        return 0;
    }

    static verify() {
        return Game.game_state.verify();
    }

    static openOptionsMenu() {
        const menu = document.querySelector("#options-menu") as OptionsMenu;
        menu?.enable();
    }

    static  toggleOptionsMenu() {
        const menu = document.querySelector("#options-menu") as OptionsMenu;
        menu?.toggle();
    }

    static pause(manual: boolean = true) {
        Game.pause_time = performance.now();
        Game.table_view.pauseAll(manual);
        // TODO: add an indicator that game is paused an progress will be updated when unpaused
    }

    static advancePausedGame(diff: number) {
        // Keep track of the total time we have simulated. While total less than diff, find the clock with the least remaining time,
        // tick it and add its remaining time to the total. 
        // TODO: this may need to be optimized if we have a lot of clocks
        const grid = Game.clock_manager.grid;
        const notPaused = (c: Clock) => !c.manually_paused;
        // Nothing to do if all clocks were manually paused clocks
        if (!any(grid.values(), notPaused)) {
            return;
        }
        const arbitrary_unpaused_clock = first(grid.values(), notPaused) as Clock;
        const minClockFn = (a: Clock, b: Clock) => {
            // If either is undefined/null, return the other
            return a.remainingTime() < b.remainingTime() ? a : b;
        }
        const nextClock = () => {
            return reduce(
                filter(grid.values(), c => !c.manually_paused),
                minClockFn,
                arbitrary_unpaused_clock
            );
        }
        let min_clock = nextClock();
        let simulated = 0;
        while (simulated + min_clock.remainingTime() < diff) {
            const step = min_clock.remainingTime();
            // min_clock.tickAndReset();
            Game.clock_manager.forEachClock(c => {
                if (notPaused(c)) {
                    c.advanceByScaled(step);
                }
            });
            simulated += step;
            min_clock = nextClock();
        }
        // At this point simulated is smaller than the closest remaining time, so we can advance everything in whatever order
        Game.clock_manager.forEachClock(c => {
            if (notPaused(c)) {
                c.advanceByScaled(diff - simulated);
            }
        });
    }

    static unpause(manual: boolean = true) {
        const now = performance.now();
        const diff = now - Game.pause_time;
        logUnpauseInfo?.("unpaused after" + diff + "ms");
        if (!manual) {
            Game.advancePausedGame(diff);
        }

        Game.table_view.unpauseAll(manual);
    }
}

let g = new Game();

var lastChange = performance.now();
var getChange = () => {
    var now = performance.now();
    var delta = now - lastChange;
    lastChange = now;
    return delta;
}


var pauseIntervalId;
window.addEventListener("blur", () => {
    logFocusChange?.("blur");
    Game.pause(false);
    getChange();
    pauseIntervalId = window.setInterval(() => {
        const delay = getChange();
        console.log("delay: " + delay);
        // TODO: maybe show something in the tab to indicate that the game is paused but updating
        Game.advancePausedGame(delay);
        Game.pause_time = lastChange;
    }, TEN_SECONDS); // keep game updating in background so we don't have to do a bunch of work on focus

});

window.addEventListener("focus", () => {
    logFocusChange?.("focus");
    if (pauseIntervalId) {
        window.clearInterval(pauseIntervalId);
    }
    Game.unpause(false);
});