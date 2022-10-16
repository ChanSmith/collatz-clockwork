// Cost model: cost(level) = base_cost * (level_multiplier^level) * (purchased_multiplier ^ x)
// Rounded to the nearest integer
// Where x is the number of times this upgrade has been purchased at level
// Level effects start at 1 (i.e. 0 is unpurchased)
const UPGRADES_OPTIONS = {
    applications_per_cycle: {
        name: "Applications per cycle",
        description: "Applies f an additional time each cycle.",
        base_cost: 1,
        level_multiplier: 1.5,
        purchased_multiplier: 1.10,
        max_level: Infinity,
        max_graphics_level: Infinity,
        unlocks: {
            4: ["advance_adjacent"],
        },
        applies_to: {
            Producer: true,
        },
        starts_unlocked_for: {
            Producer: true,
        },
    },
    playback_speed: {
        name: "Playback speed",
        description: "Doubles the speed at which the clock cycles.",
        base_cost: 1e3,
        level_multiplier: 10.0,
        purchased_multiplier: 1.5,
        max_level: 3,
        max_graphics_level: 3,
        applies_to: {
            Producer: true,
            Verifier: true
        },
        starts_unlocked_for: {
            Verifier: true,
        }
    },
    advance_adjacent: {
        name: "Advance Adjacent",
        description: "Each time this clock cycles sucessfully, advance adjacent (top, bottom, left, right) clocks by a small amount per level.",
        base_cost: 10,
        level_multiplier: 2.0,
        purchased_multiplier: 1.25,
        max_level: 10,
        max_graphics_level: 1,
        unlocks: {
            4: ["playback_speed"],
        },
        applies_to: {
            Producer: true,
        }
    },
};
const ADVANCE_ADJACENT_AMOUNT = 250;
class Upgrade {
    constructor(options) {
        this.options = Object.assign({}, options);
        this.purchased_counts = new Map();
    }
    // Record a purchase of upgrade at level
    recordPurchase(level) {
        if (!this.purchased_counts.has(level)) {
            this.purchased_counts.set(level, 0);
        }
        this.purchased_counts.set(level, this.purchased_counts.get(level) + 1);
    }
    // Record a purchase of upgrade from old_level to new_level
    recordPurchaseRange(old_level, new_level) {
        for (const i of range(old_level + 1, new_level + 1)) {
            this.recordPurchase(i);
        }
    }
    // Get the number of times this upgrade has been purchased at the given level
    getPurchasedCount(level) {
        if (!this.purchased_counts.has(level)) {
            return 0;
        }
        return this.purchased_counts.get(level);
    }
    // Cost to buy the given level
    getCost(level) {
        return Math.round(this.options.base_cost * (Math.pow(this.options.level_multiplier, level)) * (Math.pow(this.options.purchased_multiplier, this.getPurchasedCount(level))));
    }
    // Cost to buy the given level range (inclusive)
    getCostRange(from, to) {
        let ret = 0;
        for (const i of range(from, to + 1)) {
            ret += this.getCost(i);
        }
        return ret;
    }
    // TODO: see if it's worth it to avoid half-1 of the pow calls 
    // by doing the multiplcation for level_multiplier instead of calling getCost
    getMaxPurchaseable(current_level, money) {
        const MAX_ITERATIONS = 100000; // in case I messed something up
        let cost = 0;
        let i = current_level + 1;
        let level_cost = this.getCost(i);
        while (cost + level_cost < money && i <= this.options.max_level && i < current_level + MAX_ITERATIONS) {
            cost += level_cost;
            i++;
            level_cost = this.getCost(i);
        }
        return cost > 0 ? { level: i - 1, cost: cost } : null;
    }
}
function upgradeIds(obj) {
    return Object.keys(obj).filter(x => x in UPGRADES_OPTIONS);
}
class UpgradeTree {
    constructor(type) {
        this.type = type;
        // Upgrades that can be purchased / leveled up
        this.unlocked = {};
        // Upgrades that can't be purchased yet
        this.locked = {};
        // Upgrades that have reached the max level
        this.maxed = {};
        for (const upgrade_id in UPGRADES_OPTIONS) {
            const upgrade_options = UPGRADES_OPTIONS[upgrade_id];
            if (upgrade_options.applies_to[type]) {
                if ('starts_unlocked_for' in upgrade_options && upgrade_options.starts_unlocked_for[type]) {
                    this.unlocked[upgrade_id] = { level: 0 };
                }
                else {
                    this.locked[upgrade_id] = { level: 0 };
                }
            }
        }
    }
    // TODO: make this take in the resources and a setting for quantity (1, 10, 100, max)
    getPossibleUpgrades() {
        const possible_upgrades = {};
        for (const upgrade_id in this.unlocked) {
            const upgrade = UPGRADES[upgrade_id];
            // TODO: check if the player has enough resources
            if (upgrade.options.max_level > this.unlocked[upgrade_id].level) {
                possible_upgrades[upgrade_id] = {
                    level: this.unlocked[upgrade_id].level + 1,
                    cost: upgrade.getCost(this.unlocked[upgrade_id].level + 1)
                };
            }
        }
        return possible_upgrades;
    }
    getLockedIds() {
        return upgradeIds(this.locked);
    }
    getUnlockedIds() {
        return upgradeIds(this.unlocked);
    }
    getMaxedIds() {
        return upgradeIds(this.maxed);
    }
    getMaxPossibleUpgrades(currency) {
        const possible_upgrades = {};
        for (const upgrade_id in this.unlocked) {
            const upgrade = UPGRADES[upgrade_id];
            const max_purchaseable = upgrade.getMaxPurchaseable(this.unlocked[upgrade_id].level, currency);
            if (max_purchaseable) {
                possible_upgrades[upgrade_id] = max_purchaseable;
            }
        }
        return possible_upgrades;
    }
    applyUnlocks(unlocks, old_level, new_level) {
        for (const level_prop in unlocks) {
            const level = parseInt(level_prop);
            if (level <= old_level || level > new_level)
                continue;
            for (const unlock_id of unlocks[level]) {
                const unlock_options = UPGRADES_OPTIONS[unlock_id];
                if (unlock_options.applies_to[this.type]) {
                    this.unlocked[unlock_id] = { level: 0 };
                    delete this.locked[unlock_id];
                }
            }
        }
    }
    applyUpgrade(id, u) {
        const upgrade_options = UPGRADES_OPTIONS[id];
        const state = this.unlocked[id];
        const old_level = state.level;
        const new_level = u.level;
        if ('unlocks' in upgrade_options) {
            this.applyUnlocks(upgrade_options.unlocks, old_level, new_level);
        }
        if (new_level >= upgrade_options.max_level) {
            delete this.unlocked[id];
            this.maxed[id] = { level: new_level };
        }
        else {
            state.level = u.level;
        }
        UPGRADES[id].recordPurchaseRange(old_level, new_level);
    }
    getUpgradeLevel(id) {
        if (id in this.unlocked) {
            return this.unlocked[id].level;
        }
        else if (id in this.locked) {
            return this.locked[id].level;
        }
        else if (id in this.maxed) {
            return this.maxed[id].level;
        }
        else {
            return 0;
        }
    }
}
const upgrade_test = {
    // Just to test types are correct
    a: new Upgrade(UPGRADES_OPTIONS.applications_per_cycle),
    b: new Upgrade(UPGRADES_OPTIONS.playback_speed),
    c: new Upgrade(UPGRADES_OPTIONS.advance_adjacent),
    d: new UpgradeTree("Producer"),
    e: new UpgradeTree("Verifier"),
};
function buildUpgrades() {
    const ret = {};
    for (const upgrade_id in UPGRADES_OPTIONS) {
        ret[upgrade_id] = new Upgrade(UPGRADES_OPTIONS[upgrade_id]);
    }
    return ret;
}
const UPGRADES = buildUpgrades();
