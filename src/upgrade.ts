// TODO: decide if the upgrade effects should be here or in the Clock class
const UPGRADES = {
    applications_per_cycle: {
        name: "Applications per cycle",
        description: "The number of times f is applied each cycle.",
        base_cost : 1,
        cost_multiplier: 2.0,
        max_level: Infinity,
        unlocks: 
            {
                4: ["trigger_nearby"],
            }
        ,
        applies_to: {
            Producer: true,
        },
        starts_unlocked_for: {
            Producer: true,
        },
    },
    playback_speed: {
        name: "Playback speed",
        description: "The speed at which the sequence is played back.",
        base_cost : 1,
        cost_multiplier: 2.0,
        max_level: 10,
        applies_to: {
            Producer: true,
            Verifier: true
        }
    },
    trigger_nearby: {
        name: "Trigger nearby",
        description: "Each time this clock cycles, advance nearby clocks by some amount.",
        base_cost : 1,
        cost_multiplier: 2.0,
        max_level: 10,
        unlocks:  {
                4: ["playback_speed"],
            }
        ,
        applies_to: {
            Producer: true,
        }
    },
} as const;

type Unlocks = {
    readonly [key: number]: readonly UpgradeId[];
}

type UpgradeId = keyof typeof UPGRADES;


type UpgradeOptions = {
    name: string,
    description: string,
    base_cost: number,
    cost_multiplier: number,
    applies_to: ClockTypeSet,
    max_level: number,
    unlocks?: Unlocks,
    starts_unlocked_for?: ClockTypeSet,
}

class Upgrade {
    options: UpgradeOptions;
    cost: number;

    constructor(
        options: UpgradeOptions
    ) {
        this.options = {...options};
        this.cost = this.options.base_cost;
    }
    
    getCost(): number {
        return this.cost;
    }
    // TODO: precalculate cost for 10x, 100x, max
}

type UpgradeState = {
    level: number,
}

// type UpgradeStateMap = Map<UpgradeId, UpgradeState>;
type UpgradeStateMap = {
    [U in UpgradeId]?: UpgradeState;
}

type PossibleUpgradeState = UpgradeState;
type PossibleUpgrades = {
    [U in UpgradeId]?: PossibleUpgradeState;
}

type HasUpgradeKeys = {
    [U in UpgradeId]?: any
}

function upgradeIds(obj: HasUpgradeKeys) : readonly UpgradeId[]  {
    return Object.keys(obj).filter(x => x in UPGRADES) as readonly UpgradeId[];
}

class UpgradeTree {
    // Upgrades that can be purchased / leveled up
    unlocked: UpgradeStateMap = {};
    // Upgrades that can't be purchased yet
    locked: UpgradeStateMap = {};
    // Upgrades that have reached the max level
    maxed: UpgradeStateMap = {};

    constructor(public type: ClockType) {
        for (const upgrade_id in UPGRADES) {
            const upgrade = UPGRADES[upgrade_id];
            if (upgrade.applies_to[type]) {
                if ('starts_unlocked_for' in upgrade && upgrade.starts_unlocked_for[type]) {
                    this.unlocked[upgrade_id] = {level: 0};
                } else {
                    this.locked[upgrade_id] = {level: 0};
                }
            }
        }
    }
    // TODO: make this take in the resources and a setting for quantity (1, 10, 100, max)
    getPossibleUpgrades(): PossibleUpgrades {
        const possible_upgrades: PossibleUpgrades = {};
        for (const upgrade_id in this.unlocked) {
            const upgrade = UPGRADES[upgrade_id];
            // TODO: check if the player has enough resources
            possible_upgrades[upgrade_id] = {level: this.unlocked[upgrade_id]!.level + 1};
        }
        return possible_upgrades;
    }
    
    applyUpgrade(id: UpgradeId, u: PossibleUpgradeState) {
        const upgrade = UPGRADES[id];
        const state = this.unlocked[id]!;
        const old_level = state.level;
        state.level = u.level;
        if (!('unlocks' in upgrade)) return;
        const unlocks = upgrade.unlocks;
        for (const level_prop in unlocks) {
            const level = parseInt(level_prop);
            if (level <= old_level || level > u.level) continue;
            for (const unlock_id of unlocks[level]) {
                const unlock = UPGRADES[unlock_id];
                if (unlock.applies_to[this.type]) {
                    this.unlocked[unlock_id] = {level: 0};
                    delete this.locked[unlock_id];
                }
            }
            
        }   
    }
    
}
const upgrade_test = {
    // Just to test types are correct
     a : new Upgrade(UPGRADES.applications_per_cycle),
     b : new Upgrade(UPGRADES.playback_speed),
     c : new Upgrade(UPGRADES.trigger_nearby),
     d : new UpgradeTree("Producer"),
     e : new UpgradeTree("Verifier"),
}