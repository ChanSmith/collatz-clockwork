class Position {
    constructor(row, col) {
        this.row = row;
        this.col = col;
    }
    toString() {
        return "(" + this.row + ", " + this.col + ")";
    }
}
class UpgradeInfo {
}
class Clock {
    constructor(game, options) {
        this.game = game;
        this.options = options;
    }
    getType() {
        return this.clockType;
    }
    getPossibleUpgrades() {
        return new Map();
    }
    applyUpgrade(key) {
    }
    tick() {
        console.log("tick from " + this.toString());
    }
    toString() {
        return this.getType() + "at" + this.positionString();
    }
    getOpCount() {
        return 1;
    }
    pause() {
        if (this.animation) {
            this.animation.pause();
        }
    }
    paused() {
        var _a, _b;
        return ((_b = (_a = this.animation) === null || _a === void 0 ? void 0 : _a.playState) !== null && _b !== void 0 ? _b : "running") == "paused";
    }
    unpause() {
        if (this.animation) {
            this.animation.play();
        }
    }
    positionString() {
        return this.options.position.toString();
    }
}
class ProducerClock extends Clock {
    constructor() {
        super(...arguments);
        this.clockType = "Producer";
    }
    tick() {
        super.tick();
        const success = this.game.applyOps(this.getOpCount());
        this.game.table_view.animateCellSuccess(this.options.position, success);
    }
}
class VerifierClock extends Clock {
    constructor() {
        super(...arguments);
        this.clockType = "Verifier";
    }
    tick() {
        super.tick();
        const success = this.game.verify();
        this.game.table_view.animateCellSuccess(this.options.position, success);
    }
}
// type Clock = ProducerClock | VerifierClock;
