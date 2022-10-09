const TABLE_HEAD_SIZE = 2;
const TABLE_BODY_SIZE = 4;
// const CELL_SIZE = 64;
const SVG_NS = "http://www.w3.org/2000/svg"; // Making this https breaks it, at least when running locally

var dragLog: Logger;
// dragLog = console.log;



const HIGLIGHTED_ANIMATION_NAME = "pulse-border-hovered";
const SELECTED_ANIMATION_NAME = "pulse-border-selected";


const cell_success_keyframes = [
    { backgroundColor: "rgba(0,255,0, 1.0)" },
    { backgroundColor: "rgba(0,255,0, 0.0)" },
]

const cell_failure_keyframes = [
    { backgroundColor: "rgba(255,0,0, 1.0)" },
    { backgroundColor: "rgba(255,0,0, 0.0)" },
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
    duration: TEN_SECONDS,
    iterations: 1,
}

const reference_clock_timing = {
    duration: 1000,
    iterations: 1,
}

const STATS_UPDATE_INTERVAL = 66;
const MAX_LAG = 500;


const horizontalRatio = (element: SVGTextElement): number => {
    const parent = element.parentElement as HTMLElement;
    return element.clientWidth / parent.clientWidth;
}

const verticalRatio = (element: SVGTextElement): number => {
    const parent = element.parentElement as HTMLElement;
    return element.clientHeight / parent.clientHeight;
}


// Returns whether the ratio of both targets to actuals is greater than max_difference
const needsResize = (element: SVGTextElement, max_horizontal: number, max_vertical: number, max_difference: number = 0.1 /* 10% */) => {
    if (horizontalRatio(element) > max_horizontal || verticalRatio(element) > max_vertical) {
        return true;
    }
    return Math.abs(horizontalRatio(element) - max_horizontal) > max_difference
        && Math.abs(verticalRatio(element) - max_vertical) > max_difference;
}

const sizeTextToFitParent = (element: SVGTextElement, max_horizontal: number = 0.95, max_veritical: number = 0.5) => {

    const parent = element.parentElement;
    if (!parent || !needsResize(element, max_horizontal, max_veritical)) {
        return;
    }

    const horizontal_ratio = horizontalRatio(element);
    const vertical_ratio = verticalRatio(element);
    const ratio = Math.min(max_horizontal / horizontal_ratio, max_veritical / vertical_ratio);

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
        this.appendChild(this.svg_element);

        this.name_element = document.createElementNS(SVG_NS, "text") as SVGTextElement;
        this.name_element.classList.add("statistic-name");
        this.name_element.setAttribute("x", "50%");
        this.name_element.setAttribute("y", "0%");
        this.svg_element.appendChild(this.name_element);

        this.value_element = document.createElementNS(SVG_NS, "text") as SVGTextElement;
        this.value_element.classList.add("statistic-value");
        this.value_element.setAttribute("x", "95%");
        this.value_element.setAttribute("y", "100%");
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

const CLOCK_DRAG_SOURCE = "clock_source_pos";
class TableView {

    game: Game;


    table_container: HTMLDivElement;
    table: HTMLDivElement;
    table_head: HTMLDivElement;
    table_body: HTMLDivElement;

    dragging_cell: HTMLDivElement | null = null;
    dragging_pos: Position | null = null;
    // TODO: implement/use this
    selected_cell: HTMLDivElement | null = null;

    clock_manager: ClockManager;

    reference_clock: HTMLDivElement;

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
        let stat_view = document.createElement("div", { is: "statistic-view" }) as StatisticView;
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

    pauseAll(manual: boolean) {
        this.clock_manager.forEachClock(clock => clock.pause(manual));

    }

    unpauseAll(manual: boolean) {
        this.clock_manager.forEachClock(clock => {
            if (manual || !clock.manually_paused) {
                clock.unpause();
            }
        });
    }

    removeClock(pos: Position) {
        const cell = this.getCell(pos);
        if (!cell) {
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




    animateClock(element: SVGCircleElement, clock: Clock, offset: number = 0) {
        let background_anim = element.animate(clock_background_keyframes, clock_background_timing);
        background_anim.currentTime = offset;
        clock.animation = background_anim;

        const start = performance.now();
        background_anim.ready.then(() => {
        });
        // TODO: see if it's better to  use infinite iterations 
        // with "animationiteration" event listener on element
        background_anim.addEventListener("finish", (event) => {
            clock.tick();
            this.animateClock(element, clock, 0);
        });

    }

    getSelectedAnimationTime(cell: HTMLDivElement) {
        let time = 0;
        cell.getAnimations().some(a => {
            if (a instanceof CSSAnimation && a.animationName == SELECTED_ANIMATION_NAME && a.currentTime) {
                // Out of phase
                const raw_duration = a.effect!.getTiming().duration!;
                const duration = typeof raw_duration === "string" ? parseFloat(raw_duration.split("ms")[0]) : raw_duration;
                time = a.currentTime % (2 * duration) + duration;
                // In phase
                // time = a.currentTime %  (2 * duration);
                return true;
            }
        });
        return time;
    }
    setHighlightedAnimationTime(cell: HTMLDivElement, time: number) {
        cell.getAnimations().some(a => {
            if (a instanceof CSSAnimation && a.animationName == HIGLIGHTED_ANIMATION_NAME) {
                a.currentTime = time;
                return true;
            }
        });
    }

    // TODO: consider making dragging select cells instead (to do what, idk)
    // the target in each event is the previous cell that was hovered over not (not the original), 
    // so that wouldn't be too hard to do


    // Add handlers to cell so another cell can be dragged to it
    makeCellDragTarget(cell: HTMLDivElement, pos: Position) {
        cell.addEventListener("dragenter", (event) => {
            event.preventDefault();
            dragLog?.("Drag enter ", event)
            event.dataTransfer!.dropEffect = "move";
            cell.classList.add("drag-target");
            if (this.dragging_cell && this.dragging_cell !== cell) {
                let time = this.getSelectedAnimationTime(this.dragging_cell);
                this.setHighlightedAnimationTime(cell, time);
            }
        });
        // The drop event doesn't fire if there's no dragover event
        cell.addEventListener("dragover", (event) => {
            event.preventDefault();
        });
        cell.addEventListener("dragleave", (event) => {
            event.preventDefault();
            dragLog?.("Drag leave ", event)
            cell.classList.remove("drag-target");
        });

        cell.addEventListener("drop", (event) => {
            event.preventDefault();
            dragLog?.("Drop ", event);
            if (!this.dragging_pos) { return; }
            this.moveClock(this.dragging_pos, pos);
            cell.classList.remove("drag-target");
        });
    }

    // Add handlers to cell so it can be dragged to another cell
    makeCellDraggable(el: HTMLDivElement, pos: Position) {
        el.setAttribute("draggable", "true");
        el.addEventListener("dragstart", (event) => {
            if (!event.dataTransfer) return;
            // Could make the context menu bind to the clock instead of the cell, but this is easier
            ContextMenu.removeExistingContextMenu();
            dragLog?.("Drag start ", event);
            this.dragging_cell = el;
            this.dragging_pos = pos;
            // One of these is supposed to be set on target
            event.dataTransfer.dropEffect = "move";
            event.dataTransfer.effectAllowed = "move";
            // Set clock image if necessary
            el.classList.add("dragging");
        });
        el.addEventListener("dragend", (event) => {
            el.classList.remove("dragging");
            this.dragging_cell = null;
            this.dragging_pos = null;
        });
    }

    createClockElement(clock: Clock, animationStart: number = 0) {
        let s = document.createElementNS(SVG_NS, "svg") as SVGSVGElement;
        s.classList.add("clock");
        s.classList.add(clock.getType());

        let timer_background = document.createElementNS(SVG_NS, "circle") as SVGCircleElement;
        timer_background.classList.add("timer-background");
        timer_background.classList.add(clock.getType());

        timer_background.setAttribute("fill", "transparent");
        timer_background.setAttribute("cx", "50%");
        timer_background.setAttribute("cy", "50%");
        timer_background.setAttribute("r", "25%");

        this.animateClock(timer_background, clock);
        if (animationStart > 0) {
            clock.animation!.currentTime = animationStart;
        }

        s.appendChild(timer_background);

        return s;
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

    moveClock(from: Position, to: Position) {
        let from_cell = this.getCell(from);
        let to_cell = this.getCell(to);

        if (!from_cell || !to_cell) {
            return;
        }
        const from_clock = this.clock_manager.getClock(from);
        if (!from_clock) {
            return;
        }
        const from_start = from_clock.animation!.currentTime!;
        this.clearElementAndAnimations(from_cell);

        const to_clock = this.clock_manager.moveClock(from, to);
        if (to_clock) {
            const to_start = to_clock.animation!.currentTime!;
            this.clearElementAndAnimations(to_cell);
            from_cell.appendChild(this.createClockElement(to_clock, to_start));
        }
        const startTime = from_clock.animation!.currentTime!;
        to_cell.appendChild(this.createClockElement(from_clock, from_start));
    }

    generateTableCell(pos: Position): HTMLDivElement {
        let cell = document.createElement("div");
        cell.classList.add("clock-table-cell");
        this.generateMenuForCell(cell, pos);
        this.makeCellDragTarget(cell, pos);
        this.makeCellDraggable(cell, pos);
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

    clockCount() {
        return this.clock_manager.grid.size;
    }

    resetAll() {
        this.clock_manager.forEachClock((clock) => {
            clock.animation!.currentTime = 0;
        });
    }

    // TODO let rows/cols be added anywhere -- need to update pos of all clocks to the 
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
