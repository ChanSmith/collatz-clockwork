var logUnpauseInfo;
// logUnpauseInfo = console.log;
var logFocusChange;
//  logFocusChange = console.log;
class Game {
    constructor() {
        this.click_count = 0;
        this.pause_time = 0;
        this.generator = new CollatzGenerator();
        // this.clock_manager = new ClockManager(this);
        this.table_view = new TableView(this);
        this.game_state = new GameState();
        this.table_view.addStatistic(this.game_state.ops);
        this.table_view.addStatistic(this.game_state.checking);
        this.table_view.addStatistic(this.game_state.n);
        this.inline_styles = document.getElementById('dynamic-style').sheet;
    }
    addRow() {
        this.table_view.addRow();
    }
    addColumn() {
        this.table_view.addColumn();
    }
    addClock(pos, opts) {
        // let c: Clock = this.clock_manager.addClock(pos, opts);
        // let c: Clock = ClockManager.createClock(this, opts);
        this.table_view.addClock(pos, opts);
    }
    fillGrid() {
        const rows = this.table_view.getRows();
        const cols = this.table_view.getColumns();
        const adding = rows * cols - this.table_view.clockCount();
        const delay = TEN_SECONDS / adding;
        for (var i = 0; i < rows; i++) {
            for (var j = 0; j < cols; j++) {
                const pos = new Position(i, j);
                if (this.canAddClock(pos, "Reference")) {
                    const type = Math.random() > 0.25 ? "Producer" : "Verifier";
                    this.addClock(pos, { type: type, position: pos });
                    // this.advanceBy(delay);
                }
            }
        }
        this.redistributeTimes();
    }
    // TODO: make this only apply to some clocks?
    redistributeTimes() {
        const count = this.table_view.clockCount();
        // Pause all clocks, set time to 0, then unpause on a delay
        this.pause(true);
        this.table_view.resetAll();
        const offset = TEN_SECONDS / count;
        var offsetCount = 0;
        for (let i = 0; i < this.table_view.getRows(); i++) {
            for (let j = 0; j < this.table_view.getColumns(); j++) {
                const pos = new Position(i, j);
                if (!this.table_view.canAddClock(pos)) {
                    // TODO: track these and cancel them if another unpause comes in 
                    window.setTimeout(() => {
                        this.table_view.unpauseClock(pos);
                    }, offset * offsetCount++);
                }
            }
        }
    }
    canAddClock(pos, type) {
        return this.table_view.canAddClock(pos);
    }
    getNewClockMenuItems(pos) {
        let ret = [];
        if (this.canAddClock(pos, "Producer")) {
            ret.push({
                label: "Add Producer",
                callback: () => {
                    this.addClock(pos, { type: "Producer", position: pos });
                }
            });
        }
        if (this.canAddClock(pos, "Verifier")) {
            ret.push({
                label: "Add Verifier",
                callback: () => {
                    this.addClock(pos, { type: "Verifier", position: pos });
                }
            });
        }
        return ret;
    }
    removeClock(pos) {
        this.table_view.removeClock(pos);
    }
    getRemoveClockMenuItems(pos) {
        return [
            {
                label: "Remove Clock",
                callback: () => {
                    this.removeClock(pos);
                }
            }
        ];
    }
    getPauseClockMenuItems(pos) {
        if (this.table_view.clockPaused(pos)) {
            return [
                {
                    label: "Unpause Clock",
                    callback: () => {
                        this.table_view.unpauseClock(pos);
                    }
                }
            ];
        }
        else {
            return [
                {
                    label: "Pause Clock",
                    callback: () => {
                        this.table_view.pauseClock(pos);
                    }
                }
            ];
        }
    }
    primaryMenuItemGenerator(pos) {
        return () => {
            let items = [];
            if (this.table_view.canAddClock(pos)) {
                items.push(...this.getNewClockMenuItems(pos));
            }
            else {
                items.push(...this.getPauseClockMenuItems(pos));
            }
            return items;
        };
    }
    secondaryMenuItemGenerator(pos) {
        return () => {
            let items = [];
            if (!this.table_view.canAddClock(pos)) {
                items.push(...this.getRemoveClockMenuItems(pos));
            }
            return items;
        };
    }
    applyOps(amount) {
        const seq = this.generator.getSequence(this.game_state.n.value(), amount);
        if (seq.length > 0) {
            this.game_state.applySequence(seq);
            return true;
        }
        return false;
    }
    verify() {
        return this.game_state.verify();
    }
    openOptionsMenu() {
        const menu = document.querySelector("#options-menu");
        menu === null || menu === void 0 ? void 0 : menu.enable();
    }
    pause(manual = true) {
        this.pause_time = performance.now();
        this.table_view.pauseAll(manual);
        // TODO: add an indicator that game is paused an progress will be updated when unpaused
    }
    // advance the game by a given amount of time in ms
    advanceBy(diff) {
        const missed = Math.floor(diff / TEN_SECONDS);
        const extra = diff % TEN_SECONDS;
        logUnpauseInfo === null || logUnpauseInfo === void 0 ? void 0 : logUnpauseInfo("Performing " + missed + " extra ticks and adding " + extra + "ms to the next tick for each clock");
        // Sort clocks by progress and iterate through for each missed tick
        // Will need to redo this if we add clocks that tick at different rates
        let clocks = Array.from(filter(this.table_view.clock_manager.grid.values(), c => !c.manually_paused));
        clocks.sort((a, b) => a.remainingTime() - b.remainingTime());
        logUnpauseInfo === null || logUnpauseInfo === void 0 ? void 0 : logUnpauseInfo("Sorted clocks:" + clocks.map(c => c + ": " + c.remainingTime()));
        for (let i = 0; i < missed; i++) {
            for (const clock of clocks) {
                clock.tick();
            }
        }
        // TODO: how to handle the cell animations -- only the last will play
        // Add the extra time and tick if needed, in the same order
        for (const clock of clocks) {
            if (clock.remainingTime() < extra) {
                clock.tick();
                clock.animation.currentTime = (clock.animation.currentTime + extra) % TEN_SECONDS;
            }
            else {
                clock.animation.currentTime += extra;
            }
        }
        logUnpauseInfo === null || logUnpauseInfo === void 0 ? void 0 : logUnpauseInfo("After progressing:" + clocks.map(c => c + ": " + c.remainingTime()));
    }
    unpause(manual = true) {
        const now = performance.now();
        const diff = now - this.pause_time;
        logUnpauseInfo === null || logUnpauseInfo === void 0 ? void 0 : logUnpauseInfo("unpaused after" + diff + "ms");
        if (!manual) {
            this.advanceBy(diff);
        }
        this.table_view.unpauseAll(manual);
    }
}
let g = new Game();
var lastChange = performance.now();
var getChange = () => {
    var now = performance.now();
    var delta = now - lastChange;
    lastChange = now;
    return delta;
};
window.addEventListener("focus", () => {
    g.unpause(false);
    logFocusChange === null || logFocusChange === void 0 ? void 0 : logFocusChange("focus");
});
window.addEventListener("blur", () => {
    g.pause(false);
    logFocusChange === null || logFocusChange === void 0 ? void 0 : logFocusChange("blur");
});
// const c = new ReferenceClock(g, {type:"Reference", position: new Position(1,1)});
