var logUnpauseInfo: Logger;
    // logUnpauseInfo = console.log;

var logFocusChange: Logger;
    //  logFocusChange = console.log;

class Game {
    static game: Game;
    game_state: GameState;
    
    generator: CollatzGenerator;
    // clock_manager: ClockManager;
    table_view: TableView;
    click_count: number = 0;
    
    inline_styles: CSSStyleSheet;
    pause_time: number = 0;

    public test_achieve: boolean = false;
    testAchievementUnlocked() {
        return this.test_achieve;
    }
    constructor() {
        Game.game = this;
        this.generator = new CollatzGenerator();
        // this.clock_manager = new ClockManager(this);
        this.table_view = new TableView(this);
        this.game_state = new GameState();
        
        this.table_view.addStatistic(this.game_state.ops);
        this.table_view.addStatistic(this.game_state.checking);
        this.table_view.addStatistic(this.game_state.n);

        this.inline_styles = (document.getElementById('dynamic-style') as HTMLStyleElement).sheet!;
    }

    addRow() {
        this.table_view.addRow();
    }

    addColumn() {
        this.table_view.addColumn();
    }
    
    addClock(pos: Position, opts: ClockOptions) {
        // let c: Clock = this.clock_manager.addClock(pos, opts);
        // let c: Clock = ClockManager.createClock(this, opts);
        this.table_view.addClock(pos,opts);
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
                    const type = Math.random() > 0.25 ? "Producer" : "Verifier"
                    this.addClock(pos, {type: type, position: pos});
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

    canAddClock(pos: Position, type: ClockType) {
        return this.table_view.canAddClock(pos);
    }
    
    
    getNewClockMenuItems(pos: Position): Array<MenuItem> {
        let ret : Array<MenuItem> = [];
        if (this.canAddClock(pos, "Producer")) {
            ret.push({
                label: "Add Producer",
                callback: () => {
                    this.addClock(pos, {type:"Producer", position: pos});
                }
            });
        }
        if (this.canAddClock(pos, "Verifier")) {
            ret.push({
                label: "Add Verifier",
                callback: () => {
                    this.addClock(pos, {type:"Verifier", position: pos});
                }
            });
        }
        return ret;
        
    }
    
    removeClock(pos: Position) {
        this.table_view.removeClock(pos);
    }
    
    getRemoveClockMenuItems(pos: Position): Array<MenuItem> {
        return [
            {
                label: "Remove Clock",
                callback: () => {
                    this.removeClock(pos);
                }
            }
        ];
    }

    getPauseClockMenuItems(pos: Position): Array<MenuItem> {
        if (this.table_view.clockPaused(pos)) {
            return [
                {
                    label: "Unpause Clock",
                    callback: () => {
                        this.table_view.unpauseClock(pos);
                    }
                }
            ];
        } else  {
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
    
    
    primaryMenuItemGenerator(pos: Position): MenuItemGenerator {
        return () => {
            let items: Array<MenuItem> = [];
            if (this.table_view.canAddClock(pos)) {
                items.push(...this.getNewClockMenuItems(pos));
            }
            else {
                items.push(...this.getPauseClockMenuItems(pos));
            }
            return items;
        }
    }
    
    secondaryMenuItemGenerator(pos: Position): MenuItemGenerator {
        return () => {
            let items: Array<MenuItem> = [];
            if (!this.table_view.canAddClock(pos)) {
                items.push(...this.getRemoveClockMenuItems(pos));
            }
            return items;
        };
    }
    
    applyOps(amount: number) {
        const seq = this.generator.getSequence(this.game_state.n.value(), amount);
        if(seq.length > 0) {
            this.game_state.applySequence(seq);
            return true;
        }
        return false;
    }
    
    verify() {
        return this.game_state.verify();
    }

    openOptionsMenu() {
        const menu = document.querySelector("#options-menu") as OptionsMenu;
        menu?.enable();
    }

    pause(manual: boolean = true) {
        this.pause_time = performance.now();
        this.table_view.pauseAll(manual);
        // TODO: add an indicator that game is paused an progress will be updated when unpaused
    }

    advancePausedGame(diff: number) {
        // Keep track of the total time we have simulated. While total less than diff, find the clock with the least remaining time,
        // tick it and add its remaining time to the total. 
        // TODO: this may need to be optimized if we have a lot of clocks
        const grid = this.table_view.clock_manager.grid;
        const not_paused = (c) => !c.manually_paused;
        // Nothing to do if all clocks were manually paused clocks
        if (!any(grid.values(), not_paused)){
            return;
        }
        const firstClock = first(grid.values(), not_paused) as Clock;
        const minClockFn = (a: Clock, b: Clock) => {
            // If either is undefined/null, return the other
            return a.remainingTime() < b.remainingTime() ? a : b;
        }
        const nextClock = () => {
            return reduce(
                filter(grid.values(), c => !c.manually_paused),
                minClockFn,
                firstClock
            );
        }
        let min_clock = nextClock();
        let simulated = 0;
        while (simulated + min_clock.remainingTime() < diff) {
            const step = min_clock.remainingTime();
            // min_clock.tickAndReset();
            this.table_view.clock_manager.forEachClock(c => {
                if (not_paused(c)) {
                    c.advanceBy(step);
                }
            });
            simulated += step;
            min_clock = nextClock();
        }
        // At this point simulated is smaller than the closest remaining time, so we can advance everything in whatever order
        this.table_view.clock_manager.forEachClock(c => {
            if (not_paused(c)) {
                c.advanceBy(diff - simulated);
            }
        });
    }

    unpause(manual: boolean = true) {
        const now = performance.now();
        const diff = now - this.pause_time;
        logUnpauseInfo?.("unpaused after" + diff + "ms");
        if (!manual) {
            this.advancePausedGame(diff);
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
}


var pauseIntervalId;
window.addEventListener("blur", () => {
    logFocusChange?.("blur");
    g.pause(false);
    getChange();
    pauseIntervalId = window.setInterval(() => {
        const delay = getChange();
        console.log("delay: " + delay);
        // TODO: maybe show something in the tab to indicate that the game is paused but updating
        g.advancePausedGame(delay);
        g.pause_time = lastChange;
    } , TEN_SECONDS); // keep game updating in background so we don't have to do a bunch of work on focus
    
});

window.addEventListener("focus", () => {
    logFocusChange?.("focus");
    if (pauseIntervalId) {
        window.clearInterval(pauseIntervalId);
    }
    g.unpause(false);
});
// const dummy_audio_context = new AudioContext();
// console.log(dummy_audio_context);
// const c = new ReferenceClock(g, {type:"Reference", position: new Position(1,1)});