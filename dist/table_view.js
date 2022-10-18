// Generate the initial table body as an NxN grid
const TABLE_BODY_SIZE = 2;
// const CELL_SIZE = 64;
const SVG_NS = "http://www.w3.org/2000/svg"; // Making this https breaks it, at least when running locally
var dragLog;
// dragLog = console.log;
const HIGLIGHTED_ANIMATION_NAME = "pulse-border-hovered";
const SELECTED_ANIMATION_NAME = "pulse-border-selected";
const cell_success_keyframes = [
    { backgroundColor: "rgba(0,255,0, 1.0)" },
    { backgroundColor: "rgba(0,255,0, 0.0)" },
];
const cell_failure_keyframes = [
    { backgroundColor: "rgba(255,0,0, 1.0)" },
    { backgroundColor: "rgba(255,0,0, 0.0)" },
];
const cell_success_timing = {
    duration: 1000,
    iterations: 1,
};
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
};
const reference_clock_timing = {
    duration: 1000,
    iterations: 1,
};
const STATS_UPDATE_INTERVAL = 66;
const MAX_LAG = 500;
const horizontalRatio = (element) => {
    const parent = element.parentElement;
    return element.clientWidth / parent.clientWidth;
};
const verticalRatio = (element) => {
    const parent = element.parentElement;
    return element.clientHeight / parent.clientHeight;
};
const clockMaskId = (clock) => {
    const p = clock.getPosition();
    return `clock-mask-${p.row}-${p.col}`;
};
// Returns whether the ratio of both targets to actuals is greater than max_difference
const needsResize = (element, max_horizontal, max_vertical, max_difference = 0.1 /* 10% */) => {
    if (horizontalRatio(element) > max_horizontal || verticalRatio(element) > max_vertical) {
        return true;
    }
    return Math.abs(horizontalRatio(element) - max_horizontal) > max_difference
        && Math.abs(verticalRatio(element) - max_vertical) > max_difference;
};
const sizeTextToFitParent = (element, max_horizontal = 0.95, max_veritical = 0.5) => {
    var _a;
    const parent = element.parentElement;
    if (!parent || !needsResize(element, max_horizontal, max_veritical)) {
        return;
    }
    const horizontal_ratio = horizontalRatio(element);
    const vertical_ratio = verticalRatio(element);
    const ratio = Math.min(max_horizontal / horizontal_ratio, max_veritical / vertical_ratio);
    const current_size = parseFloat(((_a = element.getAttribute("font-size")) === null || _a === void 0 ? void 0 : _a.split("%")[0]) || "100");
    const new_size = Math.floor(current_size * ratio).toFixed(2);
    element.setAttribute("font-size", new_size + "%");
};
class StatisticView extends HTMLDivElement {
    constructor() {
        super();
        this.classList.add("statistic-box");
    }
    connectedCallback() {
        this.svg_element = document.createElementNS(SVG_NS, "svg");
        this.svg_element.classList.add("statistic-svg");
        this.svg_element.setAttribute("width", "100%");
        this.svg_element.setAttribute("height", "100%");
        this.appendChild(this.svg_element);
        this.name_element = document.createElementNS(SVG_NS, "text");
        this.name_element.classList.add("statistic-name");
        this.name_element.setAttribute("x", "50%");
        this.name_element.setAttribute("y", "0%");
        this.name_element.textContent = this.stat.displayName();
        this.svg_element.appendChild(this.name_element);
        this.value_element = document.createElementNS(SVG_NS, "text");
        this.value_element.classList.add("statistic-value");
        this.value_element.setAttribute("x", "95%");
        this.value_element.setAttribute("y", "100%");
        this.value_element.textContent = this.stat.value().toString();
        this.svg_element.appendChild(this.value_element);
        window.requestAnimationFrame(() => this.update());
    }
    // TODO: look into only updating text and size when a value changes or the size changes
    // Since calculating the actual text width is pretty expensive it seems
    update() {
        // this.name_element.textContent = this.stat.displayName();
        sizeTextToFitParent(this.name_element); // Should only need to update when cell size changes (title doesn't change)
        if (this.stat.changed()) {
            this.value_element.textContent = this.stat.value().toString();
        }
        sizeTextToFitParent(this.value_element); // Needs to update when cell size changes or when value changes
        // window.setTimeout(() => this.update(), STATS_UPDATE_INTERVAL);
        window.requestAnimationFrame(() => this.update());
    }
}
customElements.define('statistic-view', StatisticView, { extends: 'div' });
const CLOCK_DRAG_SOURCE = "clock_source_pos";
class TableView {
    constructor() {
        this.dragging_cell = null;
        this.dragging_pos = null;
        // TODO: implement/use this
        this.selected_cell = null;
        this.generateFlexTable();
    }
    highlightRow(n) {
        const row = this.table_body.children[n];
        if (row) {
            for (const cell of row.children) {
                cell.classList.add("row-highlighted");
            }
        }
    }
    unHighlightRow(n) {
        const row = this.table_body.children[n];
        if (row) {
            for (const cell of row.children) {
                cell.classList.remove("row-highlighted");
            }
        }
    }
    highlightColumn(n) {
        for (const row of this.table_body.children) {
            const cell = row.children[n];
            if (cell) {
                cell.classList.add("column-highlighted");
            }
        }
    }
    unHighlightColumn(n) {
        for (const row of this.table_body.children) {
            const cell = row.children[n];
            if (cell) {
                cell.classList.remove("column-highlighted");
            }
        }
    }
    saveState() {
        return {
            rows: this.getRows(),
            cols: this.getColumns(),
        };
    }
    restoreFrom(state) {
        this.growTo(state.rows, state.cols);
    }
    generateMenuForCell(cell, pos) {
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
            generatePrimaryMenuItems: Game.primaryMenuItemGenerator(pos),
            generateSecondaryMenuItems: Game.secondaryMenuItemGenerator(pos),
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
    addStatistic(stat) {
        let stat_view = document.createElement("div", { is: "statistic-view" });
        stat_view.stat = stat;
        this.table_head.appendChild(stat_view);
    }
    canAddClock(pos) {
        return Game.clock_manager.canAddClock(pos);
    }
    /* Assume already called canAddClock */
    addClock(pos, opts) {
        var _a;
        const clock = Game.clock_manager.addClock(pos, opts);
        let cell = this.getCell(pos);
        cell === null || cell === void 0 ? void 0 : cell.appendChild(this.createClockElement(clock, (_a = opts.offset) !== null && _a !== void 0 ? _a : 0));
    }
    clearElementAndAnimations(element) {
        element.getAnimations().forEach(a => {
            a.cancel();
        });
        while (element.firstElementChild && element.firstChild) {
            this.clearElementAndAnimations(element.firstElementChild);
            element.removeChild(element.firstChild);
        }
    }
    clockPaused(pos) {
        var _a;
        return (_a = Game.clock_manager.getClock(pos)) === null || _a === void 0 ? void 0 : _a.paused();
    }
    pauseClock(pos) {
        var _a;
        (_a = Game.clock_manager.getClock(pos)) === null || _a === void 0 ? void 0 : _a.pause();
    }
    unpauseClock(pos) {
        var _a;
        (_a = Game.clock_manager.getClock(pos)) === null || _a === void 0 ? void 0 : _a.unpause();
    }
    pauseAll(manual) {
        Game.clock_manager.forEachClock(clock => clock.pause(manual));
    }
    unpauseAll(manual) {
        Game.clock_manager.forEachClock(clock => {
            if (manual || !clock.manually_paused) {
                clock.unpause();
            }
        });
    }
    removeClock(pos) {
        const cell = this.getCell(pos);
        if (!cell) {
            return;
        }
        this.clearElementAndAnimations(cell);
        const c = Game.clock_manager.removeClock(pos);
    }
    refundClock(pos) {
        const cell = this.getCell(pos);
        if (!cell) {
            return;
        }
        this.clearElementAndAnimations(cell);
        const c = Game.clock_manager.removeClock(pos);
        if (c) {
            c.refund();
        }
    }
    getNearbyClocks(pos, radius = 1) {
        let clocks = new Array();
        const width = this.getColumns();
        const height = this.getRows();
        for (let i = -radius; i <= radius; i++) {
            for (let j = -radius; j <= radius; j++) {
                if (i == 0 && j == 0
                    || pos.row + i < 0 || pos.row + i >= height
                    || pos.col + j < 0 || pos.col + j >= width) {
                    continue;
                }
                let p = new Position(pos.row + i, pos.col + j);
                console.log("Advancing nearby: " + p.toString());
                let c = Game.clock_manager.getClock(p);
                if (c) {
                    clocks.push(c);
                }
            }
        }
        return clocks;
    }
    getAdjacentClocks(pos) {
        let clocks = new Array();
        const width = this.getColumns();
        const height = this.getRows();
        const addIfPresent = (row, col) => {
            let p = new Position(row, col);
            let c = Game.clock_manager.getClock(p);
            if (c) {
                clocks.push(c);
            }
        };
        // Top
        if (pos.row > 0) {
            addIfPresent(pos.row - 1, pos.col);
        }
        // Bottom 
        if (pos.row < height - 1) {
            addIfPresent(pos.row + 1, pos.col);
        }
        // Left
        if (pos.col > 0) {
            addIfPresent(pos.row, pos.col - 1);
        }
        // Right
        if (pos.col < width - 1) {
            addIfPresent(pos.row, pos.col + 1);
        }
        return clocks;
    }
    animateCellSuccess(pos, success) {
        let cell = this.getCell(pos);
        if (!cell) {
            return;
        }
        let keyframes = success ? cell_success_keyframes : cell_failure_keyframes;
        cell.animate(keyframes, cell_success_timing);
    }
    animateClock(element, clock, offset = 0) {
        let background_anim = element.animate(clock_background_keyframes, clock_background_timing);
        background_anim.currentTime = offset;
        clock.animation = background_anim;
        const start = performance.now();
        background_anim.ready.then(() => {
        });
        // TODO: see if it's better to  use infinite iterations 
        // with "animationiteration" event listener on element
        // background_anim.addEventListener("finish", (event) => {
        //     clock.tick();
        //     this.animateClock(element, clock, 0);
        // });
        background_anim.addEventListener("animationiteration", (e) => {
            clock.tick();
        });
    }
    getSelectedAnimationTime(cell) {
        let time = 0;
        cell.getAnimations().some(a => {
            if (a instanceof CSSAnimation && a.animationName == SELECTED_ANIMATION_NAME && a.currentTime) {
                // Out of phase
                const raw_duration = a.effect.getTiming().duration;
                const duration = typeof raw_duration === "string" ? parseFloat(raw_duration.split("ms")[0]) : raw_duration;
                time = a.currentTime % (2 * duration) + duration;
                // In phase
                // time = a.currentTime %  (2 * duration);
                return true;
            }
        });
        return time;
    }
    setHighlightedAnimationTime(cell, time) {
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
    makeCellDragTarget(cell, pos) {
        cell.addEventListener("dragenter", (event) => {
            event.preventDefault();
            dragLog === null || dragLog === void 0 ? void 0 : dragLog("Drag enter ", event);
            event.dataTransfer.dropEffect = "move";
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
            dragLog === null || dragLog === void 0 ? void 0 : dragLog("Drag leave ", event);
            cell.classList.remove("drag-target");
        });
        cell.addEventListener("drop", (event) => {
            event.preventDefault();
            dragLog === null || dragLog === void 0 ? void 0 : dragLog("Drop ", event);
            if (!this.dragging_pos) {
                return;
            }
            this.moveClock(this.dragging_pos, pos);
            cell.classList.remove("drag-target");
        });
    }
    // Add handlers to cell so it can be dragged to another cell
    makeCellDraggable(el, pos) {
        el.setAttribute("draggable", "true");
        el.addEventListener("dragstart", (event) => {
            if (!event.dataTransfer)
                return;
            // Could make the context menu bind to the clock instead of the cell, but this is easier
            ContextMenu.removeExistingContextMenu();
            dragLog === null || dragLog === void 0 ? void 0 : dragLog("Drag start ", event);
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
    createClockElement(clock, animationStart = 0) {
        const s = document.createElementNS(SVG_NS, "svg");
        s.classList.add(clock.getType());
        // const clockFace = document.createElementNS(SVG_NS, "use") as SVGUseElement;
        // clockFace.setAttribute("href", "#clockFace");
        // clockFace.setAttribute("x", "0");
        // clockFace.setAttribute("y", "0");
        // clockFace.setAttribute("width", "100%");
        // clockFace.setAttribute("height", "100%");
        // s.appendChild(clockFace);
        const mask = document.createElementNS(SVG_NS, "mask");
        const mask_id = clockMaskId(clock);
        mask.setAttribute("id", mask_id);
        const mask_circle = document.createElementNS(SVG_NS, "circle");
        mask_circle.classList.add("clock-mask");
        mask_circle.classList.add(clock.getType());
        mask_circle.setAttribute("fill", "transparent");
        mask_circle.setAttribute("cx", "50%");
        mask_circle.setAttribute("cy", "50%");
        mask_circle.setAttribute("r", "25%");
        mask.appendChild(mask_circle);
        s.appendChild(mask);
        const background = document.createElementNS(SVG_NS, "use");
        background.setAttribute("href", "#clockBackground");
        background.setAttribute("x", "0");
        background.setAttribute("y", "0");
        background.setAttribute("width", "100%");
        background.setAttribute("height", "100%");
        background.setAttribute("mask", `url(#${mask_id})`);
        background.classList.add(clock.getType());
        s.appendChild(background);
        clock.svg_element = s;
        clock.mask_circle = mask_circle;
        clock.animate();
        // this.animateClock(timer_background, clock);
        if (animationStart > 0) {
            clock.animation.currentTime = animationStart;
        }
        return s;
    }
    generateTableRow(row, size) {
        let r = document.createElement("div");
        r.classList.add("clock-table-row");
        for (let j = 0; j < size; j++) {
            let cell = this.generateTableCell(new Position(row, j));
            r.appendChild(cell);
        }
        return r;
    }
    moveClock(from, to) {
        if (from.equals(to)) {
            return;
        }
        let from_cell = this.getCell(from);
        let to_cell = this.getCell(to);
        if (!from_cell || !to_cell) {
            return;
        }
        const from_clock = Game.clock_manager.getClock(from);
        if (!from_clock) {
            return;
        }
        const from_start = from_clock.animation.currentTime;
        this.clearElementAndAnimations(from_cell);
        const to_clock = Game.clock_manager.moveClock(from, to);
        if (to_clock) {
            const to_start = to_clock.animation.currentTime;
            this.clearElementAndAnimations(to_cell);
            from_cell.appendChild(this.createClockElement(to_clock, to_start));
            to_clock.reapplyUpgradeGraphics();
        }
        to_cell.appendChild(this.createClockElement(from_clock, from_start));
        from_clock.reapplyUpgradeGraphics();
    }
    generateTableCell(pos) {
        let cell = document.createElement("div");
        cell.classList.add("clock-table-cell");
        this.generateMenuForCell(cell, pos);
        this.makeCellDragTarget(cell, pos);
        this.makeCellDraggable(cell, pos);
        return cell;
    }
    generateFlexTable() {
        this.table_container = document.getElementById("table-container");
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
    getRow(row) {
        return this.table_body.children[row];
    }
    getCell(pos) {
        return this.getRow(pos.row).children[pos.col];
    }
    getHeader() {
        return this.table_head;
    }
    getColumns() {
        return this.getRow(0).children.length;
    }
    clockCount() {
        return Game.clock_manager.grid.size;
    }
    resetAll() {
        Game.clock_manager.forEachClock((clock) => {
            clock.animation.currentTime = 0;
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
    growTo(rows, cols) {
        while (this.getColumns() < cols) {
            this.addColumn();
        }
        while (this.getRows() < rows) {
            this.addRow();
        }
    }
    buyAllUpgrades(cheapest_first = false) {
        // keep track of clocks upgrades in priority queue sorted by cheapest available upgrade
        // Repeatedly buy the cheapest upgrade until we can't afford it
        // Since costs depend on the number of upgrades, we need to recompute the costs.
        const clocks = Game.clock_manager.getClocks();
        const priorityFunction = cheapest_first ? cheapestFirst : mostExpensiveFirst;
        const getNextUpgrade = cheapest_first ? getCheapestUpgrade : getMostExpensiveUpgrade;
        const pq = new PriorityQueue(priorityFunction);
        pq.reset(clocks);
        let clock = pq.pop();
        if (!clock) {
            return;
        }
        let upgrade = getNextUpgrade(clock);
        const MAX_PURCHASES = 100000; // Mostly case I messed up
        let purchased = 0;
        while (clock && upgrade && Game.canPurchase(upgrade) && purchased < MAX_PURCHASES) {
            clock.applyUpgrade(upgrade);
            pq.push(clock);
            purchased++;
            clock = pq.pop();
            upgrade = clock ? getNextUpgrade(clock) : null;
        }
    }
}
const cheapestFirst = (clock) => {
    const cheapest = clock.getCheapestUpgrade();
    if (cheapest) {
        return cheapest.cost;
    }
    return Infinity;
};
const getCheapestUpgrade = (clock) => {
    return clock.getCheapestUpgrade();
};
const mostExpensiveFirst = (clock) => {
    const priciest = clock.getMostExpensiveUpgrade();
    if (priciest) {
        return -priciest.cost;
    }
    return Infinity;
};
const getMostExpensiveUpgrade = (clock) => {
    return clock.getMostExpensiveUpgrade();
};
