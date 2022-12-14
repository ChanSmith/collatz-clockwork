var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _a, _Achievement_DEFAULT_ACHIEVEMENT_OPTIONS;
// TODO: check for achievement unlock / level up
class Achievement {
    constructor(options) {
        this.state = { unlocked: null, last_leveled_up: null, level: null };
        this.options = Object.assign(Object.assign({}, __classPrivateFieldGet(Achievement, _a, "f", _Achievement_DEFAULT_ACHIEVEMENT_OPTIONS)), options);
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
            && this.options.level_up_condition(this.state.level)) {
            this.state.level += 1;
            this.state.last_leveled_up = Date.now();
        }
    }
    static getAchievement(id) {
        return Achievement.achievements.get(id);
    }
}
_a = Achievement;
Achievement.achievements = new Map();
_Achievement_DEFAULT_ACHIEVEMENT_OPTIONS = { value: {
        max_level: 0,
        level_up_condition: () => false,
        secret: false,
        unlocked: false,
        level: 0,
    } };
const ACHIEVEMENTS = [
    new Achievement({
        id: "test",
        name: "Test",
        description: "Test",
        unlockCondition: () => Game.testAchievementUnlocked(),
    }),
];
