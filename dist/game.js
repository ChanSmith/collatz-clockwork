var logPauseInfo;
// logPauseInfo = console.log;
var logUnpauseInfo;
// logUnpauseInfo = console.log;
var logOfflineCalcTiming;
// logOfflineCalcTiming = console.log;
var logFocusChange;
//  logFocusChange = console.log;
// Set to true in console to prevent save 
var cancelSaveOnHidden = false;
const LOCAL_STORAGE_KEY = "collatz-clockwork-save-state";
class Game {
    static testAchievementUnlocked() {
        return Game.test_achieve;
    }
    static initialize() {
        Game.generator = new CollatzGenerator();
        Game.table_view = new TableView();
        Game.clock_manager = new ClockManager();
        Game.game_state = new GameState();
        Game.click_count = 0;
        Game.auto_paused = false;
        Game.pause_time = 0;
        Game.table_view.addStatistic(Game.game_state.resources.money);
        Game.table_view.addStatistic(Game.game_state.statistics.checking);
        Game.table_view.addStatistic(Game.game_state.statistics.n);
        if (localStorage.getItem(LOCAL_STORAGE_KEY)) {
            const loading = document.createElement("p");
            loading.id = "loading";
            loading.innerText = "Calculating offline progress...";
            Game.restoreFromLocalStorage();
        }
    }
    static teardown() {
        Game.table_view.teardown();
        Game.clock_manager.teardown();
    }
    static restoreFromLocalStorage() {
        var _a;
        const state = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY));
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
        const now = Date.now();
        if (state.saved_at && now > state.saved_at) {
            // Hope this doesn't take too long. 
            Game.advancePausedGame(now - state.saved_at);
        }
        (_a = document.getElementById("loading")) === null || _a === void 0 ? void 0 : _a.remove();
    }
    static addRow() {
        Game.table_view.addRow();
    }
    static addColumn() {
        Game.table_view.addColumn();
    }
    static expandGrid() {
        const rows = Game.table_view.getRows();
        const next_level = rows - TABLE_BODY_SIZE + 1;
        if (Game.game_state.resources.money.value() < Math.pow(10, next_level)) {
            return;
        }
        Game.game_state.resources.money.subtract(Math.pow(10, next_level));
        Game.table_view.addColumn();
        Game.table_view.addRow();
        Game.table_view.setButtonText();
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
        // Go through the clocks in order of their elapsed time (i.e. lowest remaining time first)
        // And try to align them to ticks of (max remaining time / count), only moving them backwards.
        // The clock with lowest time remaining will not change, the one with the most time remaining
        // will go to 0.
        const clocks = Game.clock_manager.getClocks();
        if (!clocks) {
            return;
        } // nothing to do
        const pq = new PriorityQueue((c) => c.remainingTime());
        pq.reset(clocks);
        let i = 0;
        let clock = pq.pop();
        const max = TEN_SECONDS - clock.unscaledRemainingTime();
        const offset = max / count;
        while (clock) {
            const new_time = max - (i * offset);
            if (clock.animation.currentTime > new_time) {
                clock.animation.currentTime = new_time;
            }
            i++;
            clock = pq.pop();
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
        const clock = Game.clock_manager.getClock(pos);
        return [
            {
                label: `Scrap Clock (+$${clock.refundAmount()})`,
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
        if (menu === null || menu === void 0 ? void 0 : menu.toggle()) {
            Game.closeHelpMenu();
        }
    }
    static closeHelpMenu() {
        const menu = document.querySelector("#help-menu");
        menu === null || menu === void 0 ? void 0 : menu.classList.remove("enabled");
    }
    static toggleHelpMenu() {
        const menu = document.querySelector("#help-menu");
        if (menu === null || menu === void 0 ? void 0 : menu.classList.toggle("enabled")) {
            getOptionsMenu().disable();
        }
    }
    static pause(manual = true) {
        Game.pause_time = performance.now();
        Game.table_view.pauseAll(manual);
        if (!manual) {
            Game.auto_paused = true;
        }
        // TODO: add an indicator that game is paused an progress will be updated when unpaused
    }
    static advancePausedGame(diff) {
        // Keep track of the total time we have simulated. While total less than diff, find the clock with the least remaining time,
        // tick it and add its remaining time to the total. 
        // TODO: this may need to be optimized if we have a lot of clocks
        const startTime = performance.now();
        const grid = Game.clock_manager.grid;
        const notPaused = (c) => !c.manually_paused;
        const clocks = Array.from(filter(grid.values(), notPaused));
        // Nothing to do if all clocks were manually paused clocks
        if (clocks.length === 0) {
            return;
        }
        const clockPriority = (c) => {
            return c.remainingTime();
        };
        const pq = new PriorityQueue(clockPriority);
        pq.reset(clocks);
        const seen = new Set();
        let updateAdjacentPriorities = (c) => {
            if (c.upgrade_tree.getUpgradeLevel("advance_adjacent") > 0) {
                for (const clock of min_clock.adjacent_ticks_on_most_recent_tick) {
                    if (!seen.has(clock) && !clock.manually_paused) {
                        seen.add(clock);
                        pq.updatePriority(clock);
                        updateAdjacentPriorities(clock);
                    }
                }
            }
        };
        let simulated = 0;
        let min_clock = pq.pop();
        while (simulated + min_clock.remainingTime() < diff) {
            const step = min_clock.remainingTime();
            // min_clock.tickAndReset();
            Game.clock_manager.forEachClock(c => {
                if (notPaused(c)) {
                    c.advanceByScaled(step, true);
                }
            });
            simulated += step;
            seen.clear();
            updateAdjacentPriorities(min_clock);
            pq.push(min_clock);
            min_clock = pq.pop();
        }
        // At this point simulated is smaller than the smallest remaining time, so we can advance everything in whatever order
        Game.clock_manager.forEachClock(c => {
            if (notPaused(c)) {
                c.advanceByScaled(diff - simulated);
            }
        });
        const endTime = performance.now();
        logOfflineCalcTiming === null || logOfflineCalcTiming === void 0 ? void 0 : logOfflineCalcTiming(`Offline calc of ${diff}ms took ${(endTime - startTime) / 1000} s`);
    }
    static unpause(manual = true) {
        const now = performance.now();
        const diff = now - Game.pause_time;
        logUnpauseInfo === null || logUnpauseInfo === void 0 ? void 0 : logUnpauseInfo("unpaused after" + diff + "ms");
        if (!manual) {
            Game.advancePausedGame(diff);
        }
        Game.auto_paused = false;
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
            saved_at: Date.now(),
        };
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(save_state));
    }
    static resetSave() {
        if (!confirm("Are you sure you want to delete your progress and start a new game?")) {
            return;
        }
        Game.save();
        Game.removed_save = localStorage.getItem(LOCAL_STORAGE_KEY);
        localStorage.removeItem(LOCAL_STORAGE_KEY);
        // https://alistapart.com/article/neveruseawarning/
        if (Game.removed_save) {
            Game.makeResetButtonUndoButton();
        }
        Game.teardown();
        Game.initialize();
    }
    static undoResetSave() {
        if (Game.removed_save) {
            Game.teardown();
            localStorage.setItem(LOCAL_STORAGE_KEY, Game.removed_save);
            Game.initialize();
            Game.removed_save = null;
            Game.makeUndoButtonResetButton();
        }
    }
    static makeResetButtonUndoButton() {
        const reset_button = document.querySelector("#reset-save-button");
        if (reset_button && reset_button instanceof HTMLButtonElement) {
            reset_button.innerText = "Undo reset";
            reset_button.onclick = Game.undoResetSave;
            // Give 5 minutes to undo
            window.setTimeout(Game.makeUndoButtonResetButton, 1000 * 60 * 2.5);
        }
    }
    static makeUndoButtonResetButton() {
        const reset_button = document.querySelector("#reset-save-button");
        if (reset_button && reset_button instanceof HTMLButtonElement) {
            reset_button.innerText = "Reset progress";
            reset_button.onclick = Game.resetSave;
        }
    }
}
Game.click_count = 0;
Game.auto_paused = false;
Game.pause_time = 0;
Game.test_achieve = false;
Game.removed_save = null;
Game.initialize();
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
    if (document.visibilityState === "hidden" && !cancelSaveOnHidden) {
        console.log("Game saved");
        Game.save();
    }
});
