
class Game {
    
    game_state: GameState;
    
    generator: CollatzGenerator;
    // clock_manager: ClockManager;
    table_view: TableView;
    click_count: number = 0;
    
    constructor() {
        this.generator = new CollatzGenerator();
        // this.clock_manager = new ClockManager(this);
        this.table_view = new TableView(this);
        this.game_state = new GameState();
        
        this.table_view.addStatistic(this.game_state.ops);
        this.table_view.addStatistic(this.game_state.checking);
        this.table_view.addStatistic(this.game_state.n);
    }
    
    addClock(pos: Position, opts: ClockOptions) {
        // let c: Clock = this.clock_manager.addClock(pos, opts);
        // let c: Clock = ClockManager.createClock(this, opts);
        this.table_view.addClock(pos,opts);
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

    pause() {
        this.table_view.pause();
        // document.documentElement.style.animationPlayState = "paused";
    }

    unpause() {
        this.table_view.unpause();
        // document.documentElement.style.animationPlayState = "running";
    }
}

let g = new Game();

function handleVisibilityChange() {
    if (document.visibilityState === "hidden") {
        console.log("pausing");
        g.pause();
    } else {
        console.log("unpausing");
        g.unpause();
    }
}

document.addEventListener("visibilitychange", handleVisibilityChange);
