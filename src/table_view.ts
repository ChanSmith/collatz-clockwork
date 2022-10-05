const TABLE_HEAD_SIZE = 2;
const TABLE_BODY_SIZE = 4;
// const CELL_SIZE = 64;
const SVG_NS = "http://www.w3.org/2000/svg"; // Making this https breaks it, at least when running locally



// TODO: make these controlled by a <input type="color"> element
const CLOCK_PALETTE = {
    "Producer": "#FF55FF",
    "Verifier": "#00FF00",
}



const cell_success_keyframes = [
    {backgroundColor: "rgba(0,255,0, 1.0)"},
    {backgroundColor: "rgba(0,255,0, 0.0)"},
]

const cell_failure_keyframes = [
    {backgroundColor: "rgba(255,0,0, 1.0)"},
    {backgroundColor: "rgba(255,0,0, 0.0)"},
]

const cell_success_timing = {
    duration: 1000,
    iterations: 1,
}

const clock_background_keyframes = [
    {
        strokeDasharray: "0 calc(50% * 3.14)"
    },
    {
        strokeDasharray: "calc(50% * 3.14) 0"
    },
];

const clock_background_timing = {
    duration: 10 * 1000,
    iterations: 1,
}

const STATS_UPDATE_INTERVAL = 16;



const horizontalRatio = (element: SVGTextElement): number => {
    const parent = element.parentElement as HTMLElement;
    return element.clientWidth / parent.clientWidth;
}

const verticalRatio = (element: SVGTextElement): number => {
    const parent = element.parentElement as HTMLElement;
    return element.clientHeight / parent.clientHeight;
}


// Returns whether the ratio of both targets to actuals is greater than max_difference
const needsResize = (element: SVGTextElement, max_horizontal:number, max_vertical:number, max_difference:number = 0.1 /* 10% */) => {
    if (horizontalRatio(element) > max_horizontal || verticalRatio(element) > max_vertical) {
        return true;
    }
    return Math.abs(horizontalRatio(element) - max_horizontal) > max_difference 
            && Math.abs(verticalRatio(element) - max_vertical) > max_difference;
}

const sizeTextToFitParent = (element: SVGTextElement, max_horizontal:number = 1.0, max_veritical:number = 0.5) => {

    const parent = element.parentElement;
    if(!parent || !needsResize(element, max_horizontal, max_veritical)) {
        return;
    }

    const horizontal_ratio = horizontalRatio(element);
    const vertical_ratio = verticalRatio(element);
    const ratio = Math.min(max_horizontal / horizontal_ratio, max_veritical / vertical_ratio);
    // if (horizontal_ratio < max_horizontal && vertical_ratio < max_veritical) {
    //     ratio = Math.min(max_horizontal / horizontal_ratio, max_veritical / vertical_ratio);
    // } else {
    //     ratio = Math.min( horizontal_ratio / max_horizontal, vertical_ratio / max_veritical);
    // }

    const current_size = parseFloat(element.getAttribute("font-size")?.split("%")[0] || "100");
    const new_size = Math.floor(current_size * ratio).toFixed(2);
    element.setAttribute("font-size", new_size + "%");
}
class StatisticView extends HTMLDivElement {
    stat: DisplayableNumber;
    svg_element: SVGSVGElement;
    name_element: SVGTextElement;
    value_element: SVGTextElement;
    

    
    connectedCallback() {
        this.svg_element = document.createElementNS(SVG_NS, "svg") as SVGSVGElement;
        this.svg_element.classList.add("statistic-svg");
        this.svg_element.setAttribute("width", "100%");
        this.svg_element.setAttribute("height", "100%");
        // this.svg_element.setAttribute("viewBox", "0 0 100 100");
        this.appendChild(this.svg_element);

        this.name_element = document.createElementNS(SVG_NS, "text") as SVGTextElement;
        this.name_element.classList.add("statistic-name");
        this.name_element.setAttribute("x", "50%");
        this.name_element.setAttribute("y", "0%");
        // this.name_element.setAttribute("text-anchor", "middle");
        this.svg_element.appendChild(this.name_element);

        this.value_element = document.createElementNS(SVG_NS, "text") as SVGTextElement;
        this.value_element.classList.add("statistic-value");
        this.value_element.setAttribute("x", "100%");
        this.value_element.setAttribute("y", "100%");
        // this.value_element.setAttribute("text-anchor", "end");
        this.svg_element.appendChild(this.value_element);



        this.update();
    }
    
    
    constructor() {
        super();

        this.classList.add("statistic-box");
        
    }

    // Make display update itself every STATS_UPDATE_INTERVAL ms
    // TODO: look into only resizing when things change (e.g. cell resize or text length changes)
    update() {
        this.name_element.textContent = this.stat.displayName();
        sizeTextToFitParent(this.name_element);

        this.value_element.textContent = this.stat.value().toString();
        sizeTextToFitParent(this.value_element);


        window.setTimeout(() => this.update(), STATS_UPDATE_INTERVAL);
    }
}

customElements.define('statistic-view', StatisticView, { extends: 'div' });

class TableView {

    game: Game;


    table_container: HTMLDivElement;
    table: HTMLDivElement;
    table_head: HTMLDivElement;
    table_body: HTMLDivElement;

    clock_manager: ClockManager;

    highlightRow(n: number) {
        const row = this.table_body.children[n];
        if (row) {
            for (const cell of row.children) {
                cell.classList.add("row-highlighted");
            }
        }
    }

    unHighlightRow(n: number) {
        const row = this.table_body.children[n];
        if (row) {
            for (const cell of row.children) {
                cell.classList.remove("row-highlighted");
            }
        }
    }

    highlightColumn(n: number) {
        for (const row of this.table_body.children) {
            const cell = row.children[n];
            if (cell) {
                cell.classList.add("column-highlighted");
            }
        }
    }

    unHighlightColumn(n: number) {
        for (const row of this.table_body.children) {
            const cell = row.children[n];
            if (cell) {
                cell.classList.remove("column-highlighted");
            }
        }
    }

    constructor(game: Game) {
        this.game = game;
        this.clock_manager = new ClockManager(this.game);
        this.generateFlexTable();
    }

    generateMenuForCell(cell: HTMLElement, pos: Position) {
        let menu = new ContextMenu({
            scope: cell,
            customThemeClass: "context-menu-theme-default",
            onShow: () => {
                this.highlightRow(pos.row);
                this.highlightColumn(pos.col);
            },
            onClose: () => {
                this.unHighlightRow(pos.row);
                this.unHighlightColumn(pos.col);
            },
            generatePrimaryMenuItems: this.game.primaryMenuItemGenerator(pos),
            generateSecondaryMenuItems: this.game.secondaryMenuItemGenerator(pos),
            defaultMenuItems: [
                {
                    label: "Nothing to do here",
                    callback: () => {
                        console.log("Nothing to do here");
                    }
                },
            ],
        });
    }

    addStatistic(stat: DisplayableNumber) {
        let stat_view = document.createElement("div", {is: "statistic-view" }) as StatisticView;
        stat_view.stat = stat;
        this.table_head.appendChild(stat_view);
    }

    canAddClock(pos: Position) {
        return this.clock_manager.canAddClock(pos);
    }

    /* Assume already called canAddClock */
    addClock(pos: Position, opts: ClockOptions) {
        const clock = this.clock_manager.addClock(pos, opts);
        let cell = this.getCell(pos);
        cell?.appendChild(this.createClockElement(clock));
    }

    clearElementAndAnimations(element: Element) {
        element.getAnimations().forEach(a => {
            console.log("cancelling animation" + a.toString());
            a.cancel();
        });
        while (element.firstElementChild && element.firstChild) {
            this.clearElementAndAnimations(element.firstElementChild);
            element.removeChild(element.firstChild);
        }
    }

    clockPaused(pos: Position) {
        return this.clock_manager.getClock(pos)?.paused();
    }

    pauseClock(pos: Position) {
        this.clock_manager.getClock(pos)?.pause();
    }

    unpauseClock(pos: Position) {
        this.clock_manager.getClock(pos)?.unpause();
    }

    pause() {
        this.clock_manager.forEachClock(clock => clock.pause());
    }

    unpause() {
        this.clock_manager.forEachClock(clock => clock.unpause());
    }

    removeClock(pos: Position) {
        const cell = this.getCell(pos);
        if(!cell) {
            return;
        }
        this.clearElementAndAnimations(cell);

        const c = this.clock_manager.removeClock(pos);       
    }

    animateCellSuccess(pos: Position, success: boolean) {
        let cell = this.getCell(pos);
        if (!cell) {
            return;
        }
        let keyframes = success ? cell_success_keyframes : cell_failure_keyframes;
        cell.animate(keyframes, cell_success_timing);
        
    }

    animateClock(element: SVGCircleElement, clock: Clock) {
        let background_anim = element.animate(clock_background_keyframes, clock_background_timing);
        clock.animation = background_anim;
        background_anim.finished.then(() => {
            clock.tick();
            this.animateClock(element, clock);
        }).catch((e) => {
            // Swallow errors from intentionally cancelled animations
        });
    }

    createClockElement(clock: Clock) {
        // let div = document.createElement("div");
        let s = document.createElementNS(SVG_NS, "svg") as SVGSVGElement;
        s.classList.add("clock");
        s.classList.add(clock.getType());

        let timer_background = document.createElementNS(SVG_NS, "circle") as SVGCircleElement;
        timer_background.classList.add("timer-background");
        timer_background.classList.add(clock.getType());

        timer_background.setAttribute("fill", "transparent");
        timer_background.setAttribute("stroke", CLOCK_PALETTE[clock.getType()]);
        timer_background.setAttribute("cx", "50%");
        timer_background.setAttribute("cy", "50%");
        timer_background.setAttribute("r", "25%");

       this.animateClock(timer_background, clock);

        s.appendChild(timer_background);


        return s;
        // return div;
    }

    generateTableRow(row: number, size: number): HTMLDivElement {
        let r = document.createElement("div");
        r.classList.add("clock-table-row");
        for (let j = 0; j < size; j++) {
            let cell = this.generateTableCell(new Position(row, j));
            r.appendChild(cell);
        }
        return r;
    }


    generateTableCell(pos: Position) : HTMLDivElement  {
        let cell = document.createElement("div");
        cell.classList.add("clock-table-cell");
        this.generateMenuForCell(cell, pos);
        return cell;
    }

    generateFlexTable() {
        this.table_container = <HTMLDivElement>document.getElementById("table-container");
        this.table = document.createElement("div");
        this.table.id = "clock-table";
        this.table.classList.add("clock-table");

        this.table_head = document.createElement("div");
        this.table_head.id = "clock-table-head";
        this.table_head.classList.add("clock-table-head");
        this.table.appendChild(this.table_head);

        this.table_body = document.createElement("div");
        this.table_body.id = "clock-table-body";
        this.table_body.classList.add("clock-table-body");

        for (let i = 0; i < TABLE_BODY_SIZE; i++) {
            let row = this.generateTableRow(i, TABLE_BODY_SIZE);
            this.table_body.appendChild(row);
        }
        this.table.appendChild(this.table_body);


        this.table_container.appendChild(this.table);
    }

    getRows() {
        return this.table_body.children.length;
    }

    getRow(row: number) {
        return this.table_body.children[row];
    }

    getCell(pos: Position) {
        return this.getRow(pos.row).children[pos.col];
    }

    getHeader() {
        return this.table_head;
    }

    getColumns() {
        return this.getRow(0).children.length;
    }

    // TODO let rows/cols be added anywher -- need to update pos of all clocks to the 
    // bottom and right
    addRow() {
        let row = this.generateTableRow(this.getRows(), this.getColumns());
        this.table_body.appendChild(row);
    }

    addColumn() {
        const size = this.getColumns();
        for (let i = 0; i < this.getRows(); i++) {
            let cell = this.generateTableCell(new Position(i, size));
            this.getRow(i).appendChild(cell);
        }
    }

    updateTable() {
    }
}
