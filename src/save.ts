// This file just has types
// Clocks
type PositionSaveState = {
    row: number;
    col: number;
}

type UpgradeTreeSaveState = {
    unlocked: UpgradeStateMap;
    locked: UpgradeStateMap;
    maxed: UpgradeStateMap;
    spent: number;
}

type ClockSaveState = {
    type: ClockType;
    position: PositionSaveState;
    time: number;
    upgrades: UpgradeTreeSaveState;
}


// Game state
type ResourceSaveState = {
    value: number;
    max_value: number;
}

type ResourcesSaveState = {
    [key in keyof Resources]: ResourceSaveState;
}
type StatisticSaveState = {
    value: number;
    max_value: number;
}
type StatisticsSaveState = {
    [key in keyof Statistics]: StatisticSaveState;
}

type GameStateSaveState = {
    resources: ResourcesSaveState;
    statistics: StatisticsSaveState;
    current_seq: Array<number>;
    current_iter: number;
}


// Options
type OptionSaveState = {
    id: string;
    value?: string;
    sub_options?: OptionSaveState[];
}

type OptionsMenuSaveState = {
    options: OptionSaveState[];
}


// Table
type TableViewSaveState = {
    rows: number;
    cols: number;
}


// Overall
type GameSaveState = {
    options: OptionsMenuSaveState;
    game: GameStateSaveState;
    table_view: TableViewSaveState;
    clocks: ClockSaveState[];
}