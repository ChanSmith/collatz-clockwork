// Cost model: cost(level) = base_cost * (level_multiplier^level-1) * (purchased_multiplier ^ x)
// Rounded to the nearest integer
// Where x is the number of times this upgrade has been purchased at level
// Level effects start at 1 (i.e. 0 is unpurchased)
const UPGRADE_OPTIONS = {
    applications_per_cycle: {
        name: "Extra f per cycle",
        description: "Applies f an additional time each cycle.",
        base_cost : 1,
        level_multiplier: 1.5,
        purchased_multiplier: 1.2,
        max_level: Infinity,
        max_graphics_level: Infinity,
        unlocks: 
        {   
            5: ["advance_adjacent"],
            // Can also be unlocked by advance_adjacent level 5
            10: ["money_per_application"],
        } as const,
        applies_to: {
            Producer: true,
        },
        starts_unlocked_for: {
            Producer: true,
        },
    },
    money_per_application: {
        name: "Money per application",
        description: "Doubles the amount of money gained each time this clock applies f.",
        base_cost : 100,
        level_multiplier: 2.5,
        purchased_multiplier: 1.3,
        max_level: 20,
        max_graphics_level: 20,
        unlocks: {},
        applies_to: {
            Producer: true,
        },
        starts_unlocked_for: {},
    },
    playback_speed: {
        name: "Playback speed",
        description: "Doubles the speed at which the clock cycles.",
        base_cost : 1000,
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
        name: "Advance adjacent",
        description: "Each time this clock cycles sucessfully, advance adjacent (top, bottom, left, right) clocks by a small amount per level.",
        base_cost : 10,
        level_multiplier: 2.0,
        purchased_multiplier: 1.4,
        max_level: 10,
        max_graphics_level: 1,
        unlocks:  {
            5: ["playback_speed",
            // Can also be unlocked by applications_per_cycle level 10
            "money_per_application"],
        } as const
        ,
        applies_to: {
            Producer: true,
        }
    },
};

const ADVANCE_ADJACENT_AMOUNT = 250;

type Unlocks = {
    readonly [key: number]: readonly UpgradeId[];
}
type UnlockSources = {
    [key in UpgradeId]?: number;
}

type UpgradeId = keyof typeof UPGRADE_OPTIONS;


type UpgradeOptions = {
    // Display name
    name: string,
    // Longer description
    description: string,
    // Costs : see above
    base_cost: number,
    level_multiplier: number,
    purchased_multiplier: number,
    
    // Max level that can be upgraded to (Infinity means no limit)
    max_level: number,
    // Last level at which the graphic changes
    max_graphics_level: number,
    // What other upgrades are unlocked by this upgrade at each level
    unlocks?: Unlocks,
    unlocked_by?: UnlockSources,
    // Types of clocks that can get this upgrade
    applies_to: ClockTypeSet,
    // Types of clocks that start with this upgrade
    starts_unlocked_for?: ClockTypeSet,
}

class Upgrade {

    id: UpgradeId;
    options: UpgradeOptions;
    // The number of times this upgrade has been purchased at the given level
    purchased_counts: Map<number, number>;

    // Add to child's options that it can be unlocked by parent at level
    static addUnlockSource(parent: UpgradeId, child: UpgradeId, level: number) {
        if (!("unlocked_by" in UPGRADE_OPTIONS[child]) || !UPGRADE_OPTIONS[child]["unlocked_by"]) {
            UPGRADE_OPTIONS[child]["unlocked_by"] = {};
        }
        UPGRADE_OPTIONS[child]["unlocked_by"][parent] = level;
    }

    constructor(id:UpgradeId, options: UpgradeOptions) {
        this.id = id;
        this.options = options;
        this.purchased_counts = new Map();
        for (const level in options.unlocks) {
            for (const child of options.unlocks[level]) {
                Upgrade.addUnlockSource(id, child, parseInt(level));
            }
        }
    }
    
    // Record a purchase of upgrade at level
    recordPurchase(level: number) {
        if (!this.purchased_counts.has(level)) {
            this.purchased_counts.set(level, 0);
        }
        this.purchased_counts.set(level, this.purchased_counts.get(level)! + 1);
    }

    unrecordPurchase(level: number) {
        if (!this.purchased_counts.has(level)) {
            return;
        }
        this.purchased_counts.set(level, this.purchased_counts.get(level)! - 1);
    }
    
    // Record a purchase of upgrade from old_level to new_level
    recordPurchaseRange(old_level: number, new_level: number) {
        for (const i of range(old_level + 1, new_level + 1)) {
            this.recordPurchase(i);
        }
    }

    // Unrecord all purchases from 1 to level
    unrecordPurchasesTo(level: number) {
        for (const i of range(1, level + 1)) {
            this.unrecordPurchase(i);
        }
    }
    
    // Get the number of times this upgrade has been purchased at the given level
    getPurchasedCount(level: number): number {
        if (!this.purchased_counts.has(level)) {
            return 0;
        }
        return this.purchased_counts.get(level)!;
    }
    
    // Cost to buy the given level
    getCost(level:number): number {
        return Math.round(this.options.base_cost * (this.options.level_multiplier ** (level-1)) * (this.options.purchased_multiplier ** this.getPurchasedCount(level)));
    }
    
    // Cost to buy the given level range (inclusive)
    getCostRange(from: number, to: number): number {
        let ret = 0;
        for (const i of range(from, to+1)) {
            ret += this.getCost(i);
        }
        return ret;
    }
    
    // TODO: see if it's worth it to avoid half-1 of the pow calls 
    // by doing the multiplcation for level_multiplier instead of calling getCost
    getMaxPurchaseable(current_level: number, money: number): PossibleUpgradeState | null {
        const MAX_ITERATIONS = 100000; // in case I messed something up
        let cost = 0;
        let i = current_level + 1;
        let level_cost = this.getCost(i);
        while (cost + level_cost <= money && i <= this.options.max_level && i < current_level + MAX_ITERATIONS) {
            cost += level_cost;
            i++;
            level_cost = this.getCost(i);
        }
        
        return  cost > 0 ? {level: i-1, cost: cost, id: this.id} : null;
    }
}

interface UpgradeState {
    level: number,
}

// type UpgradeStateMap = Map<UpgradeId, UpgradeState>;
type UpgradeStateMap = {
    [U in UpgradeId]?: UpgradeState;
}

interface PossibleUpgradeState extends UpgradeState {
    id: UpgradeId,
    cost: number,
}
type PossibleUpgrades = {
    [U in UpgradeId]?: PossibleUpgradeState;
}


type HasUpgradeKeys = {
    [U in UpgradeId]?: any
}

function upgradeIds(obj: HasUpgradeKeys) : readonly UpgradeId[]  {
    return Object.keys(obj).filter(x => x in UPGRADE_OPTIONS) as readonly UpgradeId[];
}

const REFUND_RATIO = 0.5;
class UpgradeTree {
    // Upgrades that can be purchased / leveled up
    unlocked: UpgradeStateMap = {};
    // Upgrades that can't be purchased yet
    locked: UpgradeStateMap = {};
    // Upgrades that have reached the max level
    maxed: UpgradeStateMap = {};

    // Total amount spend on this tree
    spent: number = 0;
    
    constructor(public type: ClockType) {
        for (const upgrade_id in UPGRADE_OPTIONS) {
            const upgrade_options = UPGRADE_OPTIONS[upgrade_id];
            if (upgrade_options.applies_to[type]) {
                if ('starts_unlocked_for' in upgrade_options && upgrade_options.starts_unlocked_for[type]) {
                    this.unlocked[upgrade_id] = {level: 0};
                } else {
                    this.locked[upgrade_id] = {level: 0};
                }
            }
        }
    }

    saveState(): UpgradeTreeSaveState {
        return {
            unlocked: this.unlocked,
            locked: this.locked,
            maxed: this.maxed,
            spent: this.spent,
        }
    }

    restoreFrom(state: UpgradeTreeSaveState) {
        this.unlocked = {...state.unlocked};
        this.locked = {...state.locked};
        this.maxed = {...state.maxed};
        this.spent = state.spent;
    }


    // TODO: make this take in the resources and a setting for quantity (1, 10, 100, max)
    getPossibleUpgrades(): PossibleUpgrades {
        const possible_upgrades: PossibleUpgrades = {};
        for (const upgrade_id in this.unlocked) {
            const upgrade = UPGRADES[upgrade_id];
            if(upgrade.options.max_level > this.unlocked[upgrade_id]!.level) {
                possible_upgrades[upgrade_id] = {
                    // Why didn't I get a type error for not including id?
                    id: upgrade_id,
                    level: this.unlocked[upgrade_id]!.level + 1,
                    cost: upgrade.getCost(this.unlocked[upgrade_id]!.level + 1)
                };
            }
        }
        return possible_upgrades;
    }
    
    getLockedIds(): readonly UpgradeId[] {
        return upgradeIds(this.locked);
    }
    
    getUnlockedIds(): readonly UpgradeId[] {
        return upgradeIds(this.unlocked);
    }
    
    getMaxedIds(): readonly UpgradeId[] {
        return upgradeIds(this.maxed);
    }
    
    getMaxPossibleUpgrades(currency: number): PossibleUpgrades {
        const possible_upgrades: PossibleUpgrades = {};
        for (const upgrade_id in this.unlocked) {
            const upgrade = UPGRADES[upgrade_id];
            
            const max_purchaseable = upgrade.getMaxPurchaseable(this.unlocked[upgrade_id]!.level, currency);
            if (max_purchaseable) {
                possible_upgrades[upgrade_id] = max_purchaseable;
            }
        }
        return possible_upgrades;
    }
    
    applyUnlocks(unlocks: Unlocks, old_level: number, new_level: number) {
        for (const level_prop in unlocks) {
            const level = parseInt(level_prop);
            if (level <= old_level || level > new_level) continue;
            for (const unlock_id of unlocks[level]) {
                const unlock_options = UPGRADE_OPTIONS[unlock_id];
                if (unlock_options.applies_to[this.type]) {
                    this.unlocked[unlock_id] = { level: 0 };
                    delete this.locked[unlock_id];
                }
            }
            
        }
    }
    
    applyUpgrade(id: UpgradeId, u: PossibleUpgradeState) {
        const upgrade_options = UPGRADE_OPTIONS[id];
        const state = this.unlocked[id];
        if (!state) {
            throw new Error(`Upgrade ${id} is not unlocked. Trying to apply upgrade ${u.level} to it.`);
        }
        const old_level = state.level;
        const new_level = u.level;
        if ('unlocks' in upgrade_options) {
            this.applyUnlocks(upgrade_options.unlocks, old_level, new_level);
        }
        if (new_level >= upgrade_options.max_level) {
            delete this.unlocked[id];
            this.maxed[id] = {level: new_level};
        } else {
            state.level = u.level;
        }
        UPGRADES[id].recordPurchaseRange(old_level, new_level);
        this.spent += u.cost;
    }

    getAmountSpent(): number {
        return this.spent;
    }

    getRefundAmount(): number {
        return Math.floor(this.spent * REFUND_RATIO);
    }

    #remove(id: UpgradeId, map: UpgradeStateMap) {
        const upgrade = UPGRADES[id];
        const level = map[id]!.level;
        upgrade.unrecordPurchasesTo(level);
    }
    // Remove the purchases that were recorded for this tree
    reset() {
        for (const id of upgradeIds(this.unlocked)) {
            this.#remove(id, this.unlocked);
        }
        for (const id of upgradeIds(this.maxed)) {
            this.#remove(id, this.maxed);
        }
    }

    getUpgradeLevel(id: UpgradeId): number {
        if (id in this.unlocked) {
            return this.unlocked[id]!.level;
        } else if (id in this.locked) {
            return this.locked[id]!.level;
        } else if (id in this.maxed) {
            return this.maxed[id]!.level;
        } else {
            return 0;
        }
    }
    
}

function buildUpgrades() {
    const ret = {};
    for (const upgrade_id in UPGRADE_OPTIONS) {
        ret[upgrade_id] = new Upgrade(upgrade_id as UpgradeId, UPGRADE_OPTIONS[upgrade_id]);
    }
    return ret;
}
type Upgrades = { [U in UpgradeId]: Upgrade } 

const UPGRADES = buildUpgrades() as Upgrades;