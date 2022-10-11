class DisplayableNumber {
    #display_name: string;
    #value: number;
    constructor(display_name: string, value: number) {
        this.#display_name = display_name;
        this.#value = value;
    }

    set(value: number) {
        this.#value = value;
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
}

class Resource extends DisplayableNumber {
    max_value: number;

    set(value: number) {
        super.set(value);
        if (value > this.max_value) {
            this.max_value = value;
        }
    }
}

class GameState {

    ops: Resource;
    
    // TODO: track failed ops (e.g max consecutive failed ops would be a stat)
    n: Statistic;
    checking: Statistic;

    current_seq: Array<number>;
    current_iter: number;

    length: Statistic;

    constructor() {
        this.ops = new Resource('Money', 0);

        this.n = new Statistic('n', 2);
        this.checking = new Statistic('Checking', 2);
        this.length = new Statistic('Length', 1);


        this.current_seq = [2];
        this.current_iter = 0;
    }

    applySequence(seq: Array<number>) {
        const applied = seq.length;
        this.length.set(this.current_seq.push(...seq));
        this.current_iter += applied;
        this.n.set(seq[seq.length - 1]);

        this.ops.add(applied);
    }

    resetSequence(from: number) {
        this.current_seq = [from];
        this.n.set(from);
        this.checking.set(from);
        this.length.set(1);
    }

    canPurchase(possible_upgrade: PossibleUpgradeState): boolean {
        return this.ops.value() >= possible_upgrade.cost;
    }

    purchase(possible_upgrade: PossibleUpgradeState) {
        this.ops.subtract(possible_upgrade.cost);
    }

    canVerify(): boolean {
        return this.n.equals(1);
    }

    verify(): boolean {
        if (!this.canVerify()) {
            return false;
        }
        this.resetSequence(this.checking.value() + 1);
        return true;
    }
}