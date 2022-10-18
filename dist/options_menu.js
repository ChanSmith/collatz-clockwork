const CELL_SIZE_OPTION = {
    id: "cell-size",
    name: "Cell Size",
    default: "128",
    input_type: "range",
    input_options: {
        min: "4",
        max: "256",
        step: "2",
    },
    input_transformer: (s) => s + "px",
    css_variable: "--clock-table-cell-size",
};
const CLOCK_COLOR_OPTION = {
    id: "clock-color",
    name: "Clock Colors",
    sub_options: [
        {
            id: "producer",
            name: "Producer",
            default: "#7d3ccc",
            input_type: "color",
            css_variable: "--producer-color",
        },
        {
            id: "verifier",
            name: "Verifier",
            default: "#ccc53c",
            input_type: "color",
            css_variable: "--verifier-color",
        },
    ],
};
// const  = {
//     id: "buy-all-method",
//     name: "Buy All Method",
//     sub_options: [
//         {
//             id: "",
//         },
//     ],
// }
const OPTIONS = [
    CELL_SIZE_OPTION,
    CLOCK_COLOR_OPTION,
];
const DEFAULT_CLOCK_TABLE_SIZE = 64;
function updateOption(option, v) {
    const value = option.input_transformer ? option.input_transformer(v) : v;
    document.documentElement.style.setProperty(option.css_variable, value);
}
function getOptionSaveState(option) {
    var _a;
    const state = {
        id: option.id,
    };
    if ('sub_options' in option) {
        state.sub_options = (_a = option.sub_options) === null || _a === void 0 ? void 0 : _a.map(getOptionSaveState);
    }
    else {
        const input = document.getElementById(option.id);
        state.value = input.value;
    }
    return state;
}
function optionFromId(id, from = OPTIONS) {
    for (const option of from) {
        if (option.id === id) {
            return option;
        }
        if ('sub_options' in option) {
            return optionFromId(id, option.sub_options);
        }
    }
}
function restoreOptionFrom(state) {
    var _a, _b, _c;
    const option = optionFromId(state.id);
    if (option === undefined) {
        console.error("Could not find option with id " + state.id);
        return;
    }
    if ('sub_options' in state) {
        (_a = state.sub_options) === null || _a === void 0 ? void 0 : _a.forEach((sub_option) => {
            restoreOptionFrom(sub_option);
        });
    }
    else {
        const input = document.getElementById(option.id);
        input.value = (_c = (_b = state.value) !== null && _b !== void 0 ? _b : option.default) !== null && _c !== void 0 ? _c : "";
        updateOption(option, input.value);
    }
}
// TODO: add a way to register/cancel a callback for when an option changes
// e.g. to have stats title change when the clock table size changes
class OptionsMenu extends HTMLDivElement {
    constructor() {
        super();
        this.connected = false;
        this.disable();
    }
    saveState() {
        const state = {
            options: [],
        };
        for (const option of OPTIONS) {
            state.options.push(getOptionSaveState(option));
        }
        return state;
    }
    restoreFrom(state) {
        if (!this.connected) {
            this.restore_state = state;
            return;
        }
        for (const option of state.options) {
            restoreOptionFrom(option);
        }
        this.restore_state = null;
    }
    enable() {
        this.classList.remove("disabled");
        this.classList.add("enabled");
    }
    disable() {
        this.classList.remove("enabled");
        this.classList.add("disabled");
    }
    toggle() {
        this.classList.toggle("enabled");
        this.classList.toggle("disabled");
    }
    addCloseButton() {
        const close_button = document.createElement('button');
        close_button.textContent = "X";
        close_button.id = "close-options-menu";
        close_button.addEventListener('click', () => {
            this.disable();
        });
        this.wrapper.appendChild(close_button);
    }
    // TODO: actually compute/use the id if I need it
    generateOption(option, sub_option = false) {
        const container = document.createElement('div');
        container.classList.add(sub_option ? 'sub-option-container' : 'option-container');
        const label = document.createElement('label');
        label.textContent = option.name + ": ";
        container.appendChild(label);
        if (option.sub_options) {
            option.sub_options.forEach((sub_option) => {
                container.appendChild(this.generateOption(sub_option));
            });
        }
        else if (option.input_type && option.css_variable) {
            const input = document.createElement('input');
            input.type = option.input_type;
            input.id = option.id;
            container.appendChild(input);
            for (const key in option.input_options) {
                input.setAttribute(key, option.input_options[key]);
            }
            if (option.default) {
                input.value = option.default;
                const reset = document.createElement('button');
                reset.textContent = "Reset";
                reset.addEventListener('click', () => {
                    input.value = option.default;
                    updateOption(option, option.default);
                });
                container.appendChild(reset);
            }
            input.addEventListener('input', () => {
                updateOption(option, input.value);
            });
            updateOption(option, option.default);
        }
        return container;
    }
    addOptions() {
        this.addCloseButton();
        for (const option of OPTIONS) {
            this.wrapper.appendChild(this.generateOption(option));
        }
    }
    connectedCallback() {
        this.connected = true;
        this.classList.add('options-menu');
        const wrapper = document.createElement('div');
        this.wrapper = wrapper;
        wrapper.id = "options-menu-wrapper";
        this.appendChild(wrapper);
        this.addOptions();
        if (this.restore_state) {
            this.restoreFrom(this.restore_state);
        }
    }
}
customElements.define('options-menu', OptionsMenu, { extends: 'div' });
function getOptionsMenu() {
    return document.querySelector("#options-menu");
}
