var initial_cell_size_update = true;
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
    input_callback: (s) => {
        if (initial_cell_size_update) {
            initial_cell_size_update = false;
            return;
        }
        OptionsMenu.cell_size = parseInt(s);
        Game.table_view.updateClockTextSizes();
        Game.table_view.updateStatisticSizes();
    }
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
const BUY_ALL_METHOD_OPTION = {
    id: "buy-all-method",
    name: "Buy All Method",
    input_type: "radio",
    default: "cheapest-first",
    radio_options: {
        name: "buy-all-method",
        options: [
            { value: "cheapest-first", label: "Cheapest First" },
            { value: "most-expensive-first", label: "Most Expensive First" },
        ],
    },
    input_callback: (s) => {
        getOptionsMenu().buy_all_method = s;
    }
};
const OPTIONS = [
    CELL_SIZE_OPTION,
    CLOCK_COLOR_OPTION,
    BUY_ALL_METHOD_OPTION,
];
const DEFAULT_CLOCK_TABLE_SIZE = 64;
function updateOption(option, v) {
    if (option.css_variable) {
        const value = option.input_transformer ? option.input_transformer(v) : v;
        document.documentElement.style.setProperty(option.css_variable, value);
    }
    if (option.input_callback) {
        option.input_callback(v);
    }
}
function getRadioOptionSaveState(option) {
    var _a;
    const inputs = document.getElementsByName(option.radio_options.name);
    for (const input of inputs) {
        if (input.checked) {
            return {
                id: option.id,
                value: input.value,
            };
        }
    }
    return {
        id: option.id,
        value: (_a = option.default) !== null && _a !== void 0 ? _a : "",
    };
}
function getOptionSaveState(option, prefix = "") {
    var _a;
    const state = {
        id: option.id,
    };
    if ('sub_options' in option) {
        state.sub_options = (_a = option.sub_options) === null || _a === void 0 ? void 0 : _a.map((o) => getOptionSaveState(o, prefix + option.id + "-"));
    }
    else if (option.input_type == "radio") {
        return getRadioOptionSaveState(option);
    }
    else {
        const input = document.getElementById(option.id);
        if (input && input instanceof HTMLInputElement) {
            state.value = input.value;
        }
    }
    return state;
}
function optionFromId(id, from = OPTIONS, prefix = "") {
    for (const option of from) {
        if (option.id == id) {
            return option;
        }
        if ('sub_options' in option) {
            const sub_result = optionFromId(id, option.sub_options, prefix + option.id + "-");
            if (sub_result) {
                return sub_result;
            }
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
    else if (option.input_type == "radio") {
        const input = document.querySelector(`input[name="${option.radio_options.name}"][value="${state.value}"]`);
        if (input) {
            input.checked = true;
        }
    }
    else {
        const input = document.getElementById(option.id);
        if (input && input instanceof HTMLInputElement) {
            input.value = (_c = (_b = state.value) !== null && _b !== void 0 ? _b : option.default) !== null && _c !== void 0 ? _c : "";
            updateOption(option, input.value);
        }
    }
}
// TODO: add a way to register/cancel a callback for when an option changes
// e.g. to have stats title change when the clock table size changes
class OptionsMenu extends HTMLDivElement {
    constructor() {
        super();
        this.connected = false;
        // Options stored in the menu
        this.buy_all_method = "cheapest-first";
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
        this.classList.add("enabled");
    }
    disable() {
        this.classList.remove("enabled");
    }
    toggle() {
        return this.classList.toggle("enabled");
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
    generateNonRadioOption(container, option, prefix = "") {
        if (!option.input_type) {
            return;
        }
        const input = document.createElement('input');
        input.type = option.input_type;
        input.id = prefix + option.id;
        container.appendChild(input);
        if (option.input_type === "radio") {
            // For a radio input, 
        }
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
    generateRadioOption(container, option, prefix = "") {
        if (!option.input_type || !option.radio_options) {
            return;
        }
        for (const radio_option of option.radio_options.options) {
            const input = document.createElement('input');
            input.type = "radio";
            input.id = prefix + option.id + "-" + radio_option.value;
            input.value = radio_option.value;
            input.name = option.radio_options.name;
            container.appendChild(input);
            const label = document.createElement('label');
            label.textContent = radio_option.label;
            label.htmlFor = input.id;
            container.appendChild(label);
            if (radio_option.value === option.default) {
                input.checked = true;
            }
            input.addEventListener('input', () => {
                updateOption(option, input.value);
            });
        }
        if (option.default) {
            const reset = document.createElement('button');
            reset.textContent = "Reset";
            reset.addEventListener('click', () => {
                const inputs = document.getElementsByName(option.radio_options.name);
                for (const input of inputs) {
                    input.checked = input.value === option.default;
                }
                updateOption(option, option.default);
            });
            container.appendChild(reset);
            updateOption(option, option.default);
        }
    }
    // TODO: actually compute/use the id if I need it
    generateOption(option, sub_option = false, prefix = "") {
        const container = document.createElement('div');
        container.classList.add(sub_option ? 'sub-option-container' : 'option-container');
        const label = document.createElement('label');
        label.textContent = option.name + ": ";
        container.appendChild(label);
        if (option.sub_options) {
            option.sub_options.forEach((sub_option) => {
                container.appendChild(this.generateOption(sub_option, true, prefix + option.id + "-"));
            });
        }
        else if (option.input_type) {
            if (option.input_type === "radio") {
                this.generateRadioOption(container, option, prefix);
            }
            else {
                this.generateNonRadioOption(container, option, prefix);
            }
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
OptionsMenu.cell_size = DEFAULT_CLOCK_TABLE_SIZE;
customElements.define('options-menu', OptionsMenu, { extends: 'div' });
function getOptionsMenu() {
    return document.querySelector("#options-menu");
}
