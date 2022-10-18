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
var _PriorityQueue_instances, _PriorityQueue_heap, _PriorityQueue_map, _PriorityQueue_priorityFunction, _PriorityQueue_bubbleUp, _PriorityQueue_bubbleDown, _PriorityQueue_swap;
// filter(iterable, f) yields only the values where f(v) is true
function* filter(iter, f) {
    for (const v of iter) {
        if (f(v)) {
            yield v;
        }
    }
}
function any(iter, f) {
    for (const v of iter) {
        if (f(v)) {
            return true;
        }
    }
    return false;
}
function all(iter, f) {
    for (const v of iter) {
        if (!f(v)) {
            return false;
        }
    }
    return true;
}
function first(iter, f) {
    for (const v of iter) {
        if (f(v)) {
            return v;
        }
    }
    return undefined;
}
// map(iterable, f) yields f(v) for each value v
function* map(iter, f) {
    for (const v of iter) {
        yield f(v);
    }
}
// reduce(iterable, f, init) return f(v_n,f(...f(f(init, v_0), v_1)...))
function reduce(iter, f, initial) {
    let acc = initial;
    for (const v of iter) {
        acc = f(acc, v);
    }
    return acc;
}
function* range(start, end, step = 1) {
    for (let i = start; i < end; i += step) {
        yield i;
    }
}
function leftChildIndex(i) {
    return 2 * i + 1;
}
function rightChildIndex(i) {
    return 2 * i + 2;
}
function parentIndex(i) {
    return Math.floor((i - 1) / 2);
}
class PriorityQueue {
    constructor(priorityFunction) {
        _PriorityQueue_instances.add(this);
        _PriorityQueue_heap.set(this, void 0);
        _PriorityQueue_map.set(this, void 0);
        _PriorityQueue_priorityFunction.set(this, void 0);
        __classPrivateFieldSet(this, _PriorityQueue_heap, [], "f");
        __classPrivateFieldSet(this, _PriorityQueue_priorityFunction, priorityFunction, "f");
    }
    reset(values) {
        __classPrivateFieldSet(this, _PriorityQueue_heap, values.slice(), "f");
        __classPrivateFieldSet(this, _PriorityQueue_map, new Map(), "f");
        if (values.length === 0) {
            return;
        }
        for (let i = 0; i < __classPrivateFieldGet(this, _PriorityQueue_heap, "f").length; i++) {
            __classPrivateFieldGet(this, _PriorityQueue_map, "f").set(__classPrivateFieldGet(this, _PriorityQueue_heap, "f")[i], i);
        }
        for (let i = Math.floor(__classPrivateFieldGet(this, _PriorityQueue_heap, "f").length / 2); i >= 0; i--) {
            __classPrivateFieldGet(this, _PriorityQueue_instances, "m", _PriorityQueue_bubbleDown).call(this, i);
        }
    }
    push(...values) {
        for (const v of values) {
            __classPrivateFieldGet(this, _PriorityQueue_heap, "f").push(v);
            __classPrivateFieldGet(this, _PriorityQueue_map, "f").set(v, __classPrivateFieldGet(this, _PriorityQueue_heap, "f").length - 1);
            __classPrivateFieldGet(this, _PriorityQueue_instances, "m", _PriorityQueue_bubbleUp).call(this, __classPrivateFieldGet(this, _PriorityQueue_heap, "f").length - 1);
        }
    }
    peek() {
        return __classPrivateFieldGet(this, _PriorityQueue_heap, "f")[0];
    }
    peekPriority() {
        return __classPrivateFieldGet(this, _PriorityQueue_priorityFunction, "f").call(this, __classPrivateFieldGet(this, _PriorityQueue_heap, "f")[0]);
    }
    pop() {
        if (__classPrivateFieldGet(this, _PriorityQueue_heap, "f").length === 0) {
            return undefined;
        }
        const result = __classPrivateFieldGet(this, _PriorityQueue_heap, "f")[0];
        __classPrivateFieldGet(this, _PriorityQueue_map, "f").delete(result);
        const last = __classPrivateFieldGet(this, _PriorityQueue_heap, "f").pop();
        if (__classPrivateFieldGet(this, _PriorityQueue_heap, "f").length !== 0) {
            __classPrivateFieldGet(this, _PriorityQueue_heap, "f")[0] = last;
            __classPrivateFieldGet(this, _PriorityQueue_map, "f").set(last, 0);
            __classPrivateFieldGet(this, _PriorityQueue_instances, "m", _PriorityQueue_bubbleDown).call(this, 0);
        }
        return result;
    }
    updatePriority(v) {
        const i = __classPrivateFieldGet(this, _PriorityQueue_map, "f").get(v);
        if (i !== undefined) {
            __classPrivateFieldGet(this, _PriorityQueue_instances, "m", _PriorityQueue_bubbleUp).call(this, i);
            __classPrivateFieldGet(this, _PriorityQueue_instances, "m", _PriorityQueue_bubbleDown).call(this, i);
        }
    }
    updateAllPriorities() {
        for (let i = Math.floor(__classPrivateFieldGet(this, _PriorityQueue_heap, "f").length / 2); i >= 0; i--) {
            __classPrivateFieldGet(this, _PriorityQueue_instances, "m", _PriorityQueue_bubbleDown).call(this, i);
        }
    }
    get length() {
        return __classPrivateFieldGet(this, _PriorityQueue_heap, "f").length;
    }
}
_PriorityQueue_heap = new WeakMap(), _PriorityQueue_map = new WeakMap(), _PriorityQueue_priorityFunction = new WeakMap(), _PriorityQueue_instances = new WeakSet(), _PriorityQueue_bubbleUp = function _PriorityQueue_bubbleUp(i) {
    const parent = parentIndex(i);
    if (parent >= 0 && __classPrivateFieldGet(this, _PriorityQueue_priorityFunction, "f").call(this, __classPrivateFieldGet(this, _PriorityQueue_heap, "f")[parent]) > __classPrivateFieldGet(this, _PriorityQueue_priorityFunction, "f").call(this, __classPrivateFieldGet(this, _PriorityQueue_heap, "f")[i])) {
        __classPrivateFieldGet(this, _PriorityQueue_instances, "m", _PriorityQueue_swap).call(this, parent, i);
        __classPrivateFieldGet(this, _PriorityQueue_instances, "m", _PriorityQueue_bubbleUp).call(this, parent);
    }
}, _PriorityQueue_bubbleDown = function _PriorityQueue_bubbleDown(i) {
    if (i >= __classPrivateFieldGet(this, _PriorityQueue_heap, "f").length) {
        return;
    }
    const left = leftChildIndex(i);
    const right = rightChildIndex(i);
    let min = i;
    let minPri = __classPrivateFieldGet(this, _PriorityQueue_priorityFunction, "f").call(this, __classPrivateFieldGet(this, _PriorityQueue_heap, "f")[i]);
    let leftPri;
    if (left < __classPrivateFieldGet(this, _PriorityQueue_heap, "f").length && (leftPri = __classPrivateFieldGet(this, _PriorityQueue_priorityFunction, "f").call(this, __classPrivateFieldGet(this, _PriorityQueue_heap, "f")[left])) < minPri) {
        min = left;
        minPri = leftPri;
    }
    if (right < __classPrivateFieldGet(this, _PriorityQueue_heap, "f").length && __classPrivateFieldGet(this, _PriorityQueue_priorityFunction, "f").call(this, __classPrivateFieldGet(this, _PriorityQueue_heap, "f")[right]) < minPri) {
        min = right;
    }
    if (min !== i) {
        __classPrivateFieldGet(this, _PriorityQueue_instances, "m", _PriorityQueue_swap).call(this, min, i);
        __classPrivateFieldGet(this, _PriorityQueue_instances, "m", _PriorityQueue_bubbleDown).call(this, min);
    }
}, _PriorityQueue_swap = function _PriorityQueue_swap(i, j) {
    const temp = __classPrivateFieldGet(this, _PriorityQueue_heap, "f")[i];
    __classPrivateFieldGet(this, _PriorityQueue_heap, "f")[i] = __classPrivateFieldGet(this, _PriorityQueue_heap, "f")[j];
    __classPrivateFieldGet(this, _PriorityQueue_heap, "f")[j] = temp;
    __classPrivateFieldGet(this, _PriorityQueue_map, "f").set(__classPrivateFieldGet(this, _PriorityQueue_heap, "f")[i], i);
    __classPrivateFieldGet(this, _PriorityQueue_map, "f").set(__classPrivateFieldGet(this, _PriorityQueue_heap, "f")[j], j);
};
