var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _DisplayableNumber_display_name, _DisplayableNumber_value, _DisplayableNumber_changed;
class DisplayableNumber {
    constructor(display_name, value) {
        _DisplayableNumber_display_name.set(this, void 0);
        _DisplayableNumber_value.set(this, void 0);
        _DisplayableNumber_changed.set(this, void 0);
        __classPrivateFieldSet(this, _DisplayableNumber_display_name, display_name, "f");
        __classPrivateFieldSet(this, _DisplayableNumber_value, value, "f");
        __classPrivateFieldSet(this, _DisplayableNumber_changed, false, "f");
    }
    set(value) {
        __classPrivateFieldSet(this, _DisplayableNumber_value, value, "f");
        __classPrivateFieldSet(this, _DisplayableNumber_changed, true, "f");
    }
    add(value) {
        this.set(__classPrivateFieldGet(this, _DisplayableNumber_value, "f") + value);
    }
    subtract(value) {
        this.set(__classPrivateFieldGet(this, _DisplayableNumber_value, "f") - value);
    }
    displayName() {
        return __classPrivateFieldGet(this, _DisplayableNumber_display_name, "f");
    }
    value() {
        return __classPrivateFieldGet(this, _DisplayableNumber_value, "f");
    }
    // Returns whether the value changed since the last call to this function
    changed() {
        const changed = __classPrivateFieldGet(this, _DisplayableNumber_changed, "f");
        __classPrivateFieldSet(this, _DisplayableNumber_changed, false, "f");
        return changed;
    }
    toString() {
        return __classPrivateFieldGet(this, _DisplayableNumber_display_name, "f") + ": " + __classPrivateFieldGet(this, _DisplayableNumber_value, "f");
    }
    equals(other) {
        if (other instanceof DisplayableNumber) {
            return __classPrivateFieldGet(this, _DisplayableNumber_value, "f") === other.value();
        }
        else {
            return __classPrivateFieldGet(this, _DisplayableNumber_value, "f") === other;
        }
    }
}
_DisplayableNumber_display_name = new WeakMap(), _DisplayableNumber_value = new WeakMap(), _DisplayableNumber_changed = new WeakMap();
class Statistic extends DisplayableNumber {
    set(value) {
        super.set(value);
        if (value > this.max_value) {
            this.max_value = value;
        }
    }
    saveState() {
        return {
            value: this.value(),
            max_value: this.max_value,
        };
    }
}
class Resource extends DisplayableNumber {
    set(value) {
        super.set(value);
        if (value > this.max_value) {
            this.max_value = value;
        }
    }
    saveState() {
        return {
            value: this.value(),
            max_value: this.max_value,
        };
    }
}
function getResourcesSaveState(resources) {
    return {
        money: resources.money.saveState(),
    };
}
function getStatisticsSaveState(statistics) {
    return {
        n: statistics.n.saveState(),
        checking: statistics.checking.saveState(),
        length: statistics.length.saveState(),
    };
}
class GameState {
    constructor() {
        this.resources = {
            money: new Resource("Money", 0),
        };
        this.statistics = {
            n: new Statistic("n", 2),
            checking: new Statistic("Checking", 2),
            length: new Statistic("Length", 1),
        };
        this.current_seq = [2];
        this.current_iter = 0;
    }
    saveState() {
        return {
            resources: getResourcesSaveState(this.resources),
            statistics: getStatisticsSaveState(this.statistics),
            current_seq: this.current_seq,
            current_iter: this.current_iter,
        };
    }
    restoreFrom(save_state) {
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
    applySequence(seq) {
        const applied = seq.length;
        this.statistics.length.set(this.current_seq.push(...seq));
        this.current_iter += applied;
        this.statistics.n.set(seq[seq.length - 1]);
    }
    resetSequence(from) {
        this.current_seq = [from];
        this.statistics.n.set(from);
        this.statistics.checking.set(from);
        this.statistics.length.set(1);
    }
    canPurchase(possible_upgrade) {
        return this.resources.money.value() >= possible_upgrade.cost;
    }
    purchase(possible_upgrade) {
        this.resources.money.subtract(possible_upgrade.cost);
    }
    canVerify() {
        return this.statistics.n.equals(1);
    }
    verify() {
        if (!this.canVerify()) {
            return false;
        }
        this.resetSequence(this.statistics.checking.value() + 1);
        return true;
    }
}
