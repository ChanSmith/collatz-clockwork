const DEFAULT_CLOCK_TABLE_SIZE = 64;


class OptionsMenu extends HTMLDivElement {

    enabled: boolean;

    wrapper: HTMLDivElement;

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
        
        slider.oninput =  (event) => {
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

    addOptions() {
        this.addCloseButton();
        this.addSizeSlider();
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