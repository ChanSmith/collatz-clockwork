class Game {
    constructor() {
        this.click_count = 0;
        this.generator = new CollatzGenerator();
        // this.clock_manager = new ClockManager(this);
        this.table_view = new TableView(this);
        this.game_state = new GameState();
        this.table_view.addStatistic(this.game_state.ops);
        this.table_view.addStatistic(this.game_state.checking);
        this.table_view.addStatistic(this.game_state.n);
    }
    addClock(pos, opts) {
        // let c: Clock = this.clock_manager.addClock(pos, opts);
        // let c: Clock = ClockManager.createClock(this, opts);
        this.table_view.addClock(pos, opts);
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
    primaryMenuItemGenerator(pos) {
        return () => {
            let items = [];
            if (this.table_view.canAddClock(pos)) {
                items.push(...this.getNewClockMenuItems(pos));
            }
            else {
                // Get upgrades?
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
}
let g = new Game();
