class Position {
    constructor(public row: number, public col: number) { }

    toString(): string {
        return "(" + this.row + ", " + this.col + ")";
    }
}

type ClockType = "Producer" | "Verifier";

// class ClockOptions {
//     constructor(public type: ClockType, public position: Position) {}
// }

interface ClockOptions {
    type: ClockType;
    position: Position;
}

class UpgradeInfo {

}

abstract class Clock {

    abstract readonly clockType: ClockType;

    getType(): ClockType {
        return this.clockType;
    }

    constructor(public game: Game, public options: ClockOptions) { }

    getPossibleUpgrades(): Map<string, UpgradeInfo> {
        return new Map<string, UpgradeInfo>();
    }

    applyUpgrade(key: string) {

    }

    tick() {
        console.log("tick from " + this.toString());
    }

    toString(): string {
        return this.getType() + "at" + this.positionString();
    }

    getOpCount(): number {
        return 1;
    }

    positionString(): string {
        return this.options.position.toString();
    }


}

class ProducerClock extends Clock {
    readonly clockType = "Producer";

    tick() {
        super.tick();
        const success = this.game.applyOps(this.getOpCount());
        this.game.table_view.animateCellSuccess(this.options.position, success);
    }

}

class VerifierClock extends Clock {
    readonly clockType = "Verifier";

    tick() {
        super.tick();
        const success = this.game.verify();
        this.game.table_view.animateCellSuccess(this.options.position, success);
    }

}

// type Clock = ProducerClock | VerifierClock;