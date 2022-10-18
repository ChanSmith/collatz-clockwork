// ContextMenu modified from https://github.com/GeorgianStan/vanilla-context-menu
interface CoreOptions {
    transformOrigin: [string, string];
}
interface DefaultOptions {
    transitionDuration: number;
    additionalScopeClass: string;
    theme: 'black' | 'white';
}

interface MenuInstanceOptions {
    title: string;
    items: MenuItem[];
}

type MenuItemGenerator = (slider_value: number) => MenuInstanceOptions;

interface ConfigurableOptions extends Partial<DefaultOptions> {
    scope: HTMLElement;
    generatePrimaryMenuItems?: MenuItemGenerator;
    generateSecondaryMenuItems?: MenuItemGenerator;
    defaultMenuItems: MenuItem[];
    onShow?: () => void;
    onClose?: () => void;
    customClass?: string;
    customThemeClass?: string;
    preventCloseOnClick?: boolean;
}
interface Options extends ConfigurableOptions, CoreOptions {
}
interface MenuOption {
    label: string;
    // Called when the option is chosen
    callback: (ev: MouseEvent) => any;
    // Called when the option menu slider is changed, if the option has a slider
    sliderCallback?: (value: number) => MenuOption;
    // Additional info to display when the option is hovered
    description?: string;
    //TODO: add suboptions
    iconClass?: string;
    preventCloseOnClick?: boolean;
    disabled?: boolean;
}
type MenuItem = MenuOption | 'hr' | 'slider';

interface MenuOptionAndElement {
    option: MenuOption;
    element: HTMLElement;
}
interface State {
    defaultMenuItems: MenuItem[];
}

class ContextMenu {
    // private vars
    #initialContextMenuEvent: MouseEvent | undefined;

    #state: State = { defaultMenuItems: [] };

    #contextMenuElement: HTMLElement | null = null;
    #titleElement: HTMLElement | null = null;
    #currentMenuOptions: MenuOptionAndElement[] | null = null;

    static currentContextMenu: ContextMenu | undefined;
    // 0 = 1, 0.5 = 1/2 Max, 1 = Max,
    static sliderValue = 0.5;

    #coreOptions: CoreOptions = {
        transformOrigin: ['top', 'left'],
    };

    #defaultOptions: DefaultOptions = {
        theme: 'black',
        transitionDuration: 200,
        additionalScopeClass: "selected",
    };

    // will be populated in constructor
    //@ts-ignore
    #options: Options = {};

    // private methods

    #generateCloseButton(): HTMLElement {
        const close_button = document.createElement('button');
        close_button.textContent = "X";
        close_button.classList.add('context-menu-close-button');
        close_button.addEventListener('click', () => {
            ContextMenu.removeExistingContextMenu();
        });
        return close_button;
    }

    #generateTitleElement(initial_title: string): HTMLElement {
        const title = document.createElement('div');
        title.classList.add('context-menu-title');
        this.#titleElement = document.createElement('span');
        this.#titleElement.classList.add('context-menu-title-text');
        this.#titleElement.innerText = initial_title;
        title.appendChild(this.#titleElement);
        return title;
    }

    #generateTooltipElement(description: string) {
        const tooltip = document.createElement('div');
        tooltip.classList.add('context-menu-tooltip');
        tooltip.innerText = description;
        return tooltip;
    }

    // TODO: add option for the slider to be 
    // relative (1 -> max)
    //   - represented by a slider from 0 to 1
    //   - final value is max puchasable * slider value
    // or absolute (1, 10, 100, etc)
    //   - represented by a slider from 0 to log10(max(max purchasable))+1 with ticks of 1
    //   - final value is 10^slider value
    // Would need to change callback parameter to be more structured to tell what type of slider it is

    #generateSlider(): HTMLElement {
        const slider_container = document.createElement('div');
        slider_container.classList.add('context-menu-slider');

        const min_label = document.createElement('span');
        min_label.classList.add('context-menu-slider-min-label');
        min_label.innerText = "1";

        const max_label = document.createElement('span');
        max_label.classList.add('context-menu-slider-max-label');
        max_label.innerText = "Max";
        
        const slider = document.createElement('input');
        slider.type = "range";
        slider.min = "0";
        slider.max = "1";
        slider.step = "0.01";
        slider.value = ContextMenu.sliderValue.toString();
        slider.addEventListener('input', (ev) => {
            ContextMenu.sliderValue = parseFloat((ev.target as HTMLInputElement).value);
            this.#updateMenuItems(ContextMenu.sliderValue);
            // Update the menu options to reflect new cost/amount
            
        });
        slider_container.appendChild(min_label);
        slider_container.appendChild(slider);
        slider_container.appendChild(max_label);
        return slider_container;
    }

    //TODO: call this when money changes (or just periodically)
    #updateMenuItems(slider_value: number): void {
        let newMenuOptions: MenuOptionAndElement[] = [];
        for (const item of this.#currentMenuOptions!) {
            if (item.option.sliderCallback) {
                const new_option = item.option.sliderCallback(slider_value);
                const new_element = this.#generateMenuItem(new_option);
                newMenuOptions.push({
                    option: item.option,
                    element: new_element,
                });
                item.element.replaceWith(new_element);
            } else {
                newMenuOptions.push(item);
            }
        }
        this.#currentMenuOptions = newMenuOptions;
    }

    #generateMenuItem(option: MenuOption): HTMLElement {
        const menuItem = document.createElement('div');
        
        menuItem.classList.add('menu-item');
        if (option.disabled) {
            menuItem.classList.add('disabled');
        }
        const label = document.createElement('span');
        label.classList.add('label');
        label.textContent = option.label;
        menuItem.appendChild(label);
        if (!option.disabled) {
            this.#bindCallbacks(menuItem, option);
        }
        if (option.description) {
            menuItem.title = option.description;
        }

        return menuItem
    }

    /**
     * Create the context menu with menu items
     */
    #buildContextMenu = (button: number): HTMLElement => {
        const contextMenu: HTMLElement = document.createElement('div');
        // wrapper.innerHTML = template(this.#state);
        contextMenu.classList.add('context-menu');

        contextMenu.appendChild(this.#generateCloseButton());
        

        let menuItems: MenuItem[];
        let menuOptionElements: {option: MenuOption, element: HTMLElement}[] = [];
        let title: string = "";
        if (button === 0 && this.#options.generatePrimaryMenuItems) {
            const instanceOptions = this.#options.generatePrimaryMenuItems(ContextMenu.sliderValue);
            menuItems = instanceOptions.items;
            title = instanceOptions.title;
        } else if (button === 2 && this.#options.generateSecondaryMenuItems) {
            const instanceOptions = this.#options.generateSecondaryMenuItems(ContextMenu.sliderValue);
            menuItems = instanceOptions.items;
            title = instanceOptions.title;
        } else {
            menuItems = this.#state.defaultMenuItems;
        }
        contextMenu.appendChild(this.#generateTitleElement(title));
        for (const item of menuItems) {
            if (item === 'hr') {
                const hr = document.createElement('hr');
                contextMenu.appendChild(hr);
            } else if (item === 'slider') {
                contextMenu.appendChild(this.#generateSlider()); 
            } else {
                const menuItem = this.#generateMenuItem(item);
                menuOptionElements.push({ option: item, element: menuItem });
                contextMenu.appendChild(menuItem);
            }
        }
        this.#currentMenuOptions = menuOptionElements;

        // const contextMenu: HTMLElement = wrapper.children[0] as HTMLElement;
        return contextMenu;
    };

    /**
     * Normalize the context menu position so that it won't get out of bounds
     * @param mouseX
     * @param mouseY
     * @param contextMenu
     */
    #normalizePozition = (
        mouseX: number,
        mouseY: number,
        contextMenu: HTMLElement,
    ): { normalizedX: number; normalizedY: number } => {
        const scope: HTMLElement = this.#options.scope;

        // compute what is the mouse position relative to the container element (scope)
        const {
            left: scopeOffsetX,
            top: scopeOffsetY,
        } = scope.getBoundingClientRect();

        const scopeX: number = mouseX - scopeOffsetX;
        const scopeY: number = mouseY - scopeOffsetY;

        // check if the element will go out of bounds
        const outOfBoundsOnX: boolean = false; // always stay left
        // scopeX + contextMenu.clientWidth > scope.clientWidth;

        const outOfBoundsOnY: boolean = false; // always stay top
        // scopeY + contextMenu.clientHeight > scope.clientHeight;

        let normalizedX: number = mouseX;
        let normalizedY: number = mouseY;

        // normalzie on X
        if (outOfBoundsOnX) {
            normalizedX = scopeOffsetX + scope.clientWidth - contextMenu.clientWidth;
        }

        // normalize on Y
        if (outOfBoundsOnY) {
            normalizedY =
                scopeOffsetY + scope.clientHeight - contextMenu.clientHeight;
        }

        return { normalizedX, normalizedY };
    };

    static removeExistingContextMenu = (): void => {
        if (!ContextMenu.currentContextMenu) {
            return;
        }
        const c = ContextMenu.currentContextMenu
        if (c.#options.additionalScopeClass) {
            c.#options.scope.classList.remove(c.#options.additionalScopeClass);
        }

        if (c.#options.onClose) {
            c.#options.onClose();
        }
        c.#contextMenuElement?.remove();
        c.#contextMenuElement = null;
    };

    #applyStyleOnContextMenu = (
        contextMenu: HTMLElement,
        outOfBoundsOnX: boolean,
        outOfBoundsOnY: boolean,
    ): void => {
        // transition duration
        contextMenu.style.transitionDuration = `${this.#options.transitionDuration
            }ms`;

        // set the transition origin based on it's position
        const transformOrigin: [string, string] = Array.from(
            this.#options.transformOrigin,
        ) as [string, string];

        outOfBoundsOnX && (transformOrigin[1] = 'right');
        outOfBoundsOnY && (transformOrigin[0] = 'bottom');

        contextMenu.style.transformOrigin = transformOrigin.join(' ');

        // apply theme or custom css style
        if (this.#options.customThemeClass) {
            contextMenu.classList.add(this.#options.customThemeClass);
        } else {
            contextMenu.classList.add(
                "context-menu--" + this.#options.theme + "-theme",
            );
        }

        this.#options.customClass &&
            contextMenu.classList.add(this.#options.customClass);
    };

    #bindCallbacks = (htmlEl: HTMLElement, menuOption: MenuOption): void => {
        htmlEl.onclick = () => {
            if (!this.#initialContextMenuEvent) {
                return;
            }
            menuOption.callback(this.#initialContextMenuEvent);

            // global value for all menu items, or the individual option or false
            const preventCloseOnClick: boolean =
                menuOption.preventCloseOnClick ??
                this.#options.preventCloseOnClick ??
                false;

            if (!preventCloseOnClick) {
                ContextMenu.removeExistingContextMenu();
            }
        };
    };

    #onShowContextMenu = (event: MouseEvent): void => {
        event.preventDefault();
        event.stopPropagation();


        // store event so it can be passed to callbacks
        this.#initialContextMenuEvent = event;

        // the current context menu should disappear when a new one is displayed
        ContextMenu.removeExistingContextMenu();
        ContextMenu.currentContextMenu = this;

        // build and show on ui
        const contextMenu: HTMLElement = this.#buildContextMenu(event.button);
        this.#contextMenuElement = contextMenu;
        document.querySelector('body')?.append(contextMenu);

        // set the position
        const { clientX: mouseX, clientY: mouseY } = event;

        const { normalizedX, normalizedY } = this.#normalizePozition(
            mouseX,
            mouseY,
            contextMenu,
        );

        contextMenu.style.top = `${normalizedY}px`;
        contextMenu.style.left = `${normalizedX}px`;

        // apply the css configurable style
        this.#applyStyleOnContextMenu(
            contextMenu,
            mouseX !== normalizedX,
            mouseY !== normalizedY,
        );

        if (this.#options.additionalScopeClass) {
            this.#options.scope.classList.add(this.#options.additionalScopeClass);
        }

        if (this.#options.onShow) {
            this.#options.onShow();
        }

        // disable context menu for it
        contextMenu.oncontextmenu = (e) => e.preventDefault();

        // bind the callbacks on each option
        // this.#bindCallbacks(contextMenu);

        // make it visible but wait an event loop to pass
        setTimeout(() => {
            contextMenu.classList.add('visible');
        });
    };

    /**
     * Used to determine if the user has clicked outside of the context menu and if so to close it
     * @param event
     */
    #onDocumentClick = (event: MouseEvent): void => {
        const clickedTarget: HTMLElement = event.target as HTMLElement;

        if (clickedTarget.closest(".context-menu")) {
            return;
        }
        ContextMenu.removeExistingContextMenu();
    };

    constructor(configurableOptions: ConfigurableOptions) {
        this.updateOptions(configurableOptions);

        this.#state.defaultMenuItems = this.#options.defaultMenuItems;

        // bind the required event listeners
        this.#options.scope.oncontextmenu = this.#onShowContextMenu;
        this.#options.scope.onclick = this.#onShowContextMenu;

        // add a click event listener to create a modal effect for the context menu and close it if the user clicks outside of it
        document.addEventListener('click', this.#onDocumentClick);
    }

    // Public methods (API)

    /**
     * Remove all the event listeners that were registered for this feature
     */
    off(): void {
        document.removeEventListener('click', this.#onDocumentClick);
        this.#options.scope.oncontextmenu = null;
    }

    updateOptions(configurableOptions: Partial<ConfigurableOptions>): void {
        // extend default options and bind the menu items inside the state for pug template
        Object.assign(this.#options, this.#defaultOptions);
        Object.assign(this.#options, configurableOptions);
        Object.assign(this.#options, this.#coreOptions);

        this.#state.defaultMenuItems = this.#options.defaultMenuItems;
    }

    updateTitle(title: string): void {
        this.#titleElement!.innerText = title;
    }
}
