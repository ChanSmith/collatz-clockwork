const CELL_SIZE_OPTION = {
    name: "Cell Size",
    id_prefix: "cell-size",
    default: "64",
    input_type: "range",
    input_options: {
        min: "4",
        max: "256",
        value: "64",
        step: "2",
        id: "size-slider",
    },
    input_transformer: (s) => s + "px",
    css_variable: "--clock-table-cell-size",
};
const CLOCK_COLOR_OPTION = {
    name: "Clock Colors",
    id_prefix: "clock-color",
    sub_options: [
        {
            name: "Producer",
            id_prefix: "producer",
            default: "#FF55FF",
            input_type: "color",
            css_variable: "--producer-color",
        },
        {
            name: "Verifier",
            id_prefix: "verifier",
            default: "#00FF00",
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
    addSizeSlider() {
        const container = document.createElement('div');
        container.classList.add('option-container');
        const label = document.createElement('label');
        label.textContent = "Cell Size";
        container.appendChild(label);
        const slider = document.createElement('input');
        slider.type = "range";
        slider.min = "4";
        slider.max = "256";
        slider.value = "64";
        slider.step = "2";
        slider.id = "size-slider";
        // Turns out this isn't actually supported by browsers yet, but it doesn't hurt
        slider.setAttribute("list", "size-ticks");
        const ticks = document.createElement('datalist');
        ticks.id = 'size-ticks';
        for (let i = 4; i <= 256; i *= 2) {
            const tick = document.createElement('option');
            tick.value = i.toString();
            if (i % 4 == 0) {
                tick.label = i.toString() + "px";
            }
            ticks.appendChild(tick);
        }
        slider.oninput = (event) => {
            document.documentElement.style.setProperty('--clock-table-cell-size', slider.value + "px");
        };
        container.appendChild(slider);
        container.appendChild(ticks);
        const reset = document.createElement('button');
        reset.textContent = "Reset";
        reset.addEventListener('click', () => {
            slider.value = DEFAULT_CLOCK_TABLE_SIZE.toString();
            document.documentElement.style.setProperty('--clock-table-cell-size', slider.value + "px");
        });
        container.appendChild(reset);
        this.wrapper.appendChild(container);
    }
    addColorPickers() {
        const container = document.createElement('div');
        container.classList.add('option-container');
        const label = document.createElement('label');
        label.textContent = "Clock Colors:     ";
        container.appendChild(label);
        COLOR_OPTIONS_MAP.forEach((value, key) => {
            const color_container = document.createElement('div');
            color_container.classList.add('color-container');
            color_container.classList.add(key);
            const picker_label = document.createElement('label');
            picker_label.textContent = key;
            const picker = document.createElement('input');
            picker.type = "color";
            picker.value = getComputedStyle(document.documentElement).getPropertyValue(value);
            picker.addEventListener('input', () => {
                document.documentElement.style.setProperty(value, picker.value);
            });
            color_container.appendChild(picker_label);
            color_container.appendChild(picker);
            container.appendChild(color_container);
        });
        this.wrapper.appendChild(container);
    }
    generateOption(option, sub_option = false) {
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
        }
        return container;
    }
    addOptions() {
        this.addCloseButton();
        // this.addSizeSlider();
        // this.addColorPickers();
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
