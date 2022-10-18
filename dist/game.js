var logPauseInfo;
// logPauseInfo = console.log;
var logUnpauseInfo;
// logUnpauseInfo = console.log;
var logFocusChange;
//  logFocusChange = console.log;
class Game {
    constructor() {
        Game.generator = new CollatzGenerator();
        Game.table_view = new TableView();
        Game.clock_manager = new ClockManager();
        Game.game_state = new GameState();
        Game.table_view.addStatistic(Game.game_state.resources.money);
        Game.table_view.addStatistic(Game.game_state.statistics.checking);
        Game.table_view.addStatistic(Game.game_state.statistics.n);
        if (localStorage.getItem("save_state")) {
            const state = JSON.parse(localStorage.getItem("save_state"));
            Game.table_view.restoreFrom(state.table_view);
            Game.game_state.restoreFrom(state.game);
            getOptionsMenu().restoreFrom(state.options);
            for (const clock_state of state.clocks) {
                const opts = {
                    type: clock_state.type,
                    position: new Position(clock_state.position.row, clock_state.position.col),
                    offset: clock_state.time,
                };
                Game.addClock(opts.position, opts);
                const clock = Game.clock_manager.getClock(opts.position);
                if (clock) {
                    clock.restoreFrom(clock_state);
                }
            }
        }
    }
    static testAchievementUnlocked() {
        return Game.test_achieve;
    }
    static addRow() {
        Game.table_view.addRow();
    }
    static addColumn() {
        Game.table_view.addColumn();
    }
    static expandGrid() {
        Game.table_view.addColumn();
        Game.table_view.addRow();
    }
    static addClock(pos, opts) {
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
                    const type = Math.random() > 0.25 ? "Producer" : "Verifier";
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
    static canAddClock(pos, type) {
        return Game.table_view.canAddClock(pos);
    }
    static getNewClockMenuItems(pos) {
        let ret = [];
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
    static removeClock(pos) {
        Game.table_view.removeClock(pos);
    }
    static refundClock(pos) {
        Game.table_view.refundClock(pos);
    }
    static getRemoveClockMenuItems(pos) {
        return [
            {
                label: "Remove Clock",
                callback: () => {
                    Game.removeClock(pos);
                }
            }
        ];
    }
    static getRefundClockMenuItems(pos) {
        return [
            {
                label: "Refund Clock",
                description: "Remove the clock and get back half the amount spent on its upgrades.",
                callback: () => {
                    Game.refundClock(pos);
                }
            }
        ];
    }
    static getPauseClockMenuItems(pos) {
        if (Game.table_view.clockPaused(pos)) {
            return [
                {
                    label: "Unpause Clock",
                    callback: () => {
                        Game.table_view.unpauseClock(pos);
                    }
                }
            ];
        }
        else {
            return [
                {
                    label: "Pause Clock",
                    description: ("Stop the clock's movement. Clocks with the '" +
                        UPGRADE_OPTIONS["advance_adjacent"].name +
                        "' upgrade will not advance it either."),
                    callback: () => {
                        Game.table_view.pauseClock(pos);
                    }
                }
            ];
        }
    }
    static getClockUpgradeMenuItems(pos, slider_value) {
        const clock = Game.clock_manager.getClock(pos);
        if (clock) {
            return clock.getUpgradeMenuItems(slider_value);
        }
        return [];
    }
    static primaryMenuItemGenerator(pos) {
        return (slider_value) => {
            let title;
            let items = [];
            if (Game.table_view.canAddClock(pos)) {
                title = "Add Clock";
                items.push(...Game.getNewClockMenuItems(pos));
            }
            else {
                title = "Upgrade Clock";
                const upgradeMenuItems = Game.getClockUpgradeMenuItems(pos, slider_value);
                if (upgradeMenuItems.length > 0) {
                    items.push("slider");
                    items.push("hr");
                    items.push(...upgradeMenuItems);
                }
                else {
                    items.push({
                        label: "No Upgrades Available",
                        callback: () => { },
                        disabled: true,
                    });
                }
            }
            return { title: title, items: items };
        };
    }
    static secondaryMenuItemGenerator(pos) {
        return (slider_value) => {
            let items = [];
            if (Game.clock_manager.hasClock(pos)) {
                items.push(...Game.getPauseClockMenuItems(pos));
                items.push("hr");
                // items.push(...Game.getRemoveClockMenuItems(pos));
                items.push(...Game.getRefundClockMenuItems(pos));
            }
            return { title: "Other options", items: items };
        };
    }
    static canPurchase(possible_upgrade) {
        return Game.game_state.canPurchase(possible_upgrade);
    }
    static purchase(possible_upgrade) {
        Game.game_state.purchase(possible_upgrade);
    }
    static applyOps(amount, money_multiplier = 1) {
        const seq = Game.generator.getSequence(Game.game_state.statistics.n.value(), amount);
        if (seq.length > 0) {
            Game.game_state.applySequence(seq);
            Game.game_state.resources.money.add(Math.floor(amount * money_multiplier));
            return seq.length;
        }
        return 0;
    }
    static verify() {
        return Game.game_state.verify();
    }
    static openOptionsMenu() {
        const menu = document.querySelector("#options-menu");
        menu === null || menu === void 0 ? void 0 : menu.enable();
    }
    static toggleOptionsMenu() {
        const menu = document.querySelector("#options-menu");
        menu === null || menu === void 0 ? void 0 : menu.toggle();
    }
    static pause(manual = true) {
        Game.pause_time = performance.now();
        Game.table_view.pauseAll(manual);
        // TODO: add an indicator that game is paused an progress will be updated when unpaused
    }
    static advancePausedGame(diff) {
        // Keep track of the total time we have simulated. While total less than diff, find the clock with the least remaining time,
        // tick it and add its remaining time to the total. 
        // TODO: this may need to be optimized if we have a lot of clocks
        const grid = Game.clock_manager.grid;
        const notPaused = (c) => !c.manually_paused;
        // Nothing to do if all clocks were manually paused clocks
        if (!any(grid.values(), notPaused)) {
            return;
        }
        const arbitrary_unpaused_clock = first(grid.values(), notPaused);
        const minClockFn = (a, b) => {
            // If either is undefined/null, return the other
            return a.remainingTime() < b.remainingTime() ? a : b;
        };
        const nextClock = () => {
            return reduce(filter(grid.values(), c => !c.manually_paused), minClockFn, arbitrary_unpaused_clock);
        };
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
    static unpause(manual = true) {
        const now = performance.now();
        const diff = now - Game.pause_time;
        logUnpauseInfo === null || logUnpauseInfo === void 0 ? void 0 : logUnpauseInfo("unpaused after" + diff + "ms");
        if (!manual) {
            Game.advancePausedGame(diff);
        }
        Game.table_view.unpauseAll(manual);
    }
    static save() {
        const clock_states = [];
        Game.clock_manager.forEachClock(clock => {
            clock_states.push(clock.saveState());
        });
        const save_state = {
            options: getOptionsMenu().saveState(),
            game: Game.game_state.saveState(),
            table_view: Game.table_view.saveState(),
            clocks: clock_states,
        };
        localStorage.setItem("save_state", JSON.stringify(save_state));
    }
}
Game.click_count = 0;
Game.pause_time = 0;
Game.test_achieve = false;
let g = new Game();
var lastChange = performance.now();
var getChange = () => {
    var now = performance.now();
    var delta = now - lastChange;
    lastChange = now;
    return delta;
};
var pauseIntervalId;
window.addEventListener("blur", () => {
    logFocusChange === null || logFocusChange === void 0 ? void 0 : logFocusChange("blur");
    Game.pause(false);
    getChange();
    pauseIntervalId = window.setInterval(() => {
        const delay = getChange();
        logPauseInfo === null || logPauseInfo === void 0 ? void 0 : logPauseInfo("delay: " + delay);
        // TODO: maybe show something in the tab to indicate that the game is paused but updating
        Game.advancePausedGame(delay);
        Game.pause_time = lastChange;
    }, TEN_SECONDS); // keep game updating in background so we don't have to do a bunch of work on focus
});
window.addEventListener("focus", () => {
    logFocusChange === null || logFocusChange === void 0 ? void 0 : logFocusChange("focus");
    if (pauseIntervalId) {
        window.clearInterval(pauseIntervalId);
    }
    Game.unpause(false);
});
// Save every 5 minutes, or when the page is closed/hidden
window.setInterval(Game.save, 1000 * 60 * 5);
window.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
        Game.save();
    }
});
