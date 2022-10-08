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
            default: "#4b2e83",
            input_type: "color",
            css_variable: "--producer-color",
        },
        {
            id: "verifier",
            name: "Verifier",
            default: "#b7a57a",
            input_type: "color",
            css_variable: "--verifier-color",
        },
    ],
};
const OPTIONS = [
    CELL_SIZE_OPTION,
    CLOCK_COLOR_OPTION,
];
const DEFAULT_CLOCK_TABLE_SIZE = 64;
const COLOR_OPTIONS_MAP = new Map([
    ["Producer", "--producer-color"],
    ["Verifier", "--verifier-color"],
]);
class OptionsMenu extends HTMLDivElement {
    constructor() {
        super();
        this.disable();
    }
    enable() {
        this.classList.remove("disabled");
        this.classList.add("enabled");
    }
    disable() {
        this.classList.remove("enabled");
        this.classList.add("disabled");
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
    generateOption(option, sub_option = false, id = "") {
        const container = document.createElement('div');
        container.classList.add(sub_option ? 'sub-option-container' : 'option-container');
        const label = document.createElement('label');
        label.textContent = option.name + ": ";
        container.appendChild(label);
        if (option.sub_options) {
            option.sub_options.forEach((sub_option) => {
                container.appendChild(this.generateOption(sub_option, true));
            });
        }
        else if (option.input_type && option.css_variable) {
            const setValue = (v) => {
                const value = option.input_transformer ? option.input_transformer(v) : v;
                document.documentElement.style.setProperty(option.css_variable, value);
            };
            const input = document.createElement('input');
            input.type = option.input_type;
            input.id = option.name;
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
                    setValue(option.default);
                });
                container.appendChild(reset);
            }
            input.addEventListener('input', () => {
                setValue(input.value);
            });
            setValue(option.default);
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
        this.classList.add('options-menu');
        const wrapper = document.createElement('div');
        this.wrapper = wrapper;
        wrapper.id = "options-menu-wrapper";
        this.appendChild(wrapper);
        this.addOptions();
    }
}
customElements.define('options-menu', OptionsMenu, { extends: 'div' });
