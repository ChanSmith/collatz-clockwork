class DisplayableNumber {
    #display_name: string;
    #value: number;
    #changed: boolean;
    constructor(display_name: string, value: number) {
        this.#display_name = display_name;
        this.#value = value;
        this.#changed = false;
    }

    set(value: number) {
        this.#value = value;
        this.#changed = true;
    }

    add(value: number) {
        this.set(this.#value + value);
    }
    subtract(value: number) {
        this.set(this.#value - value);
    }

    displayName(): string {
        return this.#display_name;
    }

    value(): number {
        return this.#value;
    }

    // Returns whether the value changed since the last call to this function
    changed(): boolean {
        const changed = this.#changed;
        this.#changed = false;
        return changed;
    }

    toString(): string {
        return this.#display_name + ": " + this.#value;
    }

    equals(other: DisplayableNumber | number): boolean {
        if (other instanceof DisplayableNumber) {
            return this.#value === other.value();
        } else {
            return this.#value === other;
        }
    }
}

class Statistic extends DisplayableNumber {

    max_value: number;

    set(value: number) {
        super.set(value);
        if (value > this.max_value) {
            this.max_value = value;
        }
    }

    saveState(): StatisticSaveState {
        return {
            value: this.value(),
            max_value: this.max_value,
        }
    }
}

class Resource extends DisplayableNumber {
    max_value: number;

    set(value: number) {
        super.set(value);
        if (value > this.max_value) {
            this.max_value = value;
        }
    }

    saveState(): ResourceSaveState {
        return {
            value: this.value(),
            max_value: this.max_value,
        }
    }
}

type Resources = {
   money: Resource;
}

function getResourcesSaveState(resources: Resources): ResourcesSaveState {
    return {
        money: resources.money.saveState(),
    }
}

type Statistics = {
    n: Statistic;
    checking: Statistic;
    length: Statistic;
}

function getStatisticsSaveState(statistics: Statistics): StatisticsSaveState {
    return {
        n: statistics.n.saveState(),
        checking: statistics.checking.saveState(),
        length: statistics.length.saveState(),
    }
}

class GameState {

    resources: Resources;
    statistics: Statistics;

    current_seq: Array<number>;
    current_iter: number;


    constructor() {
        this.resources = {
            money: new Resource("Money", 0),
        }

        this.statistics = {
            n: new Statistic("n", 2),
            checking: new Statistic("Checking", 2),
            length: new Statistic("Length", 1),
        }
        
        this.current_seq = [2];
        this.current_iter = 0;
    }

    saveState(): GameStateSaveState {
        return {
            resources: getResourcesSaveState(this.resources),
            statistics: getStatisticsSaveState(this.statistics),
            current_seq: this.current_seq,
            current_iter: this.current_iter,
        }
    }

    restoreFrom(save_state: GameStateSaveState) {
        this.resources.money.set(save_state.resources.money.value);
        this.resources.money.max_value = save_state.resources.money.max_value;
        this.statistics.n.set(save_state.statistics.n.value);
        this.statistics.n.max_value = save_state.statistics.n.max_value;
        this.statistics.checking.set(save_state.statistics.checking.value);
        this.statistics.checking.max_value = save_state.statistics.checking.max_value;
        this.statistics.length.set(save_state.statistics.length.value);
        this.statistics.length.max_value = save_state.statistics.length.max_value;
        this.current_seq = save_state.current_seq;
        this.current_iter = save_state.current_iter;
    }

    applySequence(seq: Array<number>) {
        const applied = seq.length;
        this.statistics.length.set(this.current_seq.push(...seq));
        this.current_iter += applied;
        this.statistics.n.set(seq[seq.length - 1]);
    }

    resetSequence(from: number) {
        this.current_seq = [from];
        this.statistics.n.set(from);
        this.statistics.checking.set(from);
        this.statistics.length.set(1);
    }

    canPurchase(possible_upgrade: PossibleUpgradeState): boolean {
        return this.resources.money.value() >= possible_upgrade.cost;
    }

    purchase(possible_upgrade: PossibleUpgradeState) {
        this.resources.money.subtract(possible_upgrade.cost);
    }

    canVerify(): boolean {
        return this.statistics.n.equals(1);
    }

    verify(): boolean {
        if (!this.canVerify()) {
            return false;
        }
        this.resetSequence(this.statistics.checking.value() + 1);
        return true;
    }
}