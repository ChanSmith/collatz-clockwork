

type AchievementOptions = {
    id: string,
    name: string,
    description: string,
    unlockCondition: () => boolean,
    max_level?: number,
    level_up_condition?: (level: number) => boolean,
    secret?: boolean,
}
type ConcreteAchievementOptions = {
    [Property in keyof AchievementOptions]-?: AchievementOptions[Property];
}

type AchievementState = {
    unlocked: number | null, // Date
    last_leveled_up: number | null, // Date
    level: number | null,
}

// TODO: check for achievement unlock / level up

class Achievement {    
    static achievements: Map<string, Achievement> = new Map();
    options: ConcreteAchievementOptions;
    state: AchievementState = { unlocked: null, last_leveled_up:null, level: null};

    static #DEFAULT_ACHIEVEMENT_OPTIONS = {
        max_level: 0,
        level_up_condition: () => false,
        secret: false,
        unlocked: false,
        level: 0,
    } as const;

    constructor(
        options: AchievementOptions
        ) {
        this.options = { ...Achievement.#DEFAULT_ACHIEVEMENT_OPTIONS, ...options};
            Achievement.achievements.set(this.options.id, this);
        }

    unlock() {
        if (this.state.unlocked) {
            return;
        }
        if (this.options.unlockCondition()) {
            this.state.unlocked = Date.now();
            this.state.level = 0;
        }
    }

    levelUp() {
        if (!this.state.unlocked || !this.state.level) {
            return;
        }
        if (this.options.max_level && this.state.level < this.options.max_level
             && this.options.level_up_condition
             && this.options.level_up_condition(this.state.level)){
            this.state.level += 1;
            this.state.last_leveled_up = Date.now();
        }
    }

    static getAchievement(id: string): Achievement {
        return Achievement.achievements.get(id)!;
    }
        
}

const ACHIEVEMENTS = [
    new Achievement({
        id: "test",
        name: "Test",
        description: "Test",
        unlockCondition: () => Game.game.testAchievementUnlocked(),
    }),

]