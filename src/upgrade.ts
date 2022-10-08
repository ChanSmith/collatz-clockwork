

abstract class Upgrade {
    constructor(
        public name: string,
        public description: string,
        public cost: number,
        public type: string,
        public unlocked: boolean = false,
        public purchased: boolean = false
    ) {}

    getCost(): number {
        return this.cost;
    }
    
}