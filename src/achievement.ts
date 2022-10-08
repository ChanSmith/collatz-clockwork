

type AchievementOptions = {
    id: string,
    name: string,
    description: string,
    unlockCondition: () => boolean,
    max_level?: number,
    level_up_condition?: (level: number) => boolean,
    secret?: boolean,
    unlocked?: boolean,
    level?: number,
}
type ConcreteAchievementOptions = {
    [Property in keyof AchievementOptions]-?: AchievementOptions[Property];
}


// TODO: check for achievement unlock / level up

class Achievement {    
    static achievements: Map<string, Achievement> = new Map();
    options: ConcreteAchievementOptions;

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
        if (this.options.unlocked) {
            return;
        }
        if (this.options.unlockCondition()) {
            this.options.unlocked = true;
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