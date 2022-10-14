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
}
class Resource extends DisplayableNumber {
    set(value) {
        super.set(value);
        if (value > this.max_value) {
            this.max_value = value;
        }
    }
}
class GameState {
    constructor() {
        this.ops = new Resource('Money', 0);
        this.n = new Statistic('n', 2);
        this.checking = new Statistic('Checking', 2);
        this.length = new Statistic('Length', 1);
        this.current_seq = [2];
        this.current_iter = 0;
    }
    applySequence(seq) {
        const applied = seq.length;
        this.length.set(this.current_seq.push(...seq));
        this.current_iter += applied;
        this.n.set(seq[seq.length - 1]);
        this.ops.add(applied);
    }
    resetSequence(from) {
        this.current_seq = [from];
        this.n.set(from);
        this.checking.set(from);
        this.length.set(1);
    }
    canPurchase(possible_upgrade) {
        return this.ops.value() >= possible_upgrade.cost;
    }
    purchase(possible_upgrade) {
        this.ops.subtract(possible_upgrade.cost);
    }
    canVerify() {
        return this.n.equals(1);
    }
    verify() {
        if (!this.canVerify()) {
            return false;
        }
        this.resetSequence(this.checking.value() + 1);
        return true;
    }
}
