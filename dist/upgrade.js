class Upgrade {
    constructor(name, description, cost, type, unlocked = false, purchased = false) {
        this.name = name;
        this.description = description;
        this.cost = cost;
        this.type = type;
        this.unlocked = unlocked;
        this.purchased = purchased;
    }
    getCost() {
        return this.cost;
    }
}
