// ContextMenu modified from https://github.com/GeorgianStan/vanilla-context-menu (licensed under MIT license)
interface CoreOptions {
    transformOrigin: [string, string];
}
interface DefaultOptions {
    transitionDuration: number;
    addCancel: boolean;
    theme: 'black' | 'white';
}

type MenuItemGenerator = () => MenuItem[];

interface ConfigurableOptions extends Partial<DefaultOptions> {
    scope: HTMLElement;
    generatePrimaryMenuItems?: MenuItemGenerator;
    generateSecondaryMenuItems?: MenuItemGenerator;
    defaultMenuItems: MenuItem[];
    customClass?: string;
    customThemeClass?: string;
    preventCloseOnClick?: boolean;
}
interface Options extends ConfigurableOptions, CoreOptions {
}
interface MenuOption {
    label: string;
    callback: (ev: MouseEvent) => any;
    iconClass?: string;
    preventCloseOnClick?: boolean;
}
type MenuItem = MenuOption | 'hr';


interface State {
    defaultMenuItems: MenuItem[];
}

class ContextMenu {
    // private vars
    #initialContextMenuEvent: MouseEvent | undefined;

    #state: State = { defaultMenuItems: [] };

    #coreOptions: CoreOptions = {
        transformOrigin: ['top', 'left'], 
    };

    #defaultOptions: DefaultOptions = {
        theme: 'black',
        transitionDuration: 200,
        addCancel: true,
    };

    // will be populated in constructor
    //@ts-ignore
    #options: Options = {};

    // private methods

    #generateCancelItems(): MenuItem[] {
        return [
            {
                label: 'Close Menu',
                callback: () => {},
                preventCloseOnClick: false,
            },
            "hr"

        ]
    }

    /**
     * Create the context menu with menu items
     */
    #buildContextMenu = (button: number): HTMLElement => {
        const contextMenu: HTMLElement = document.createElement('div');
        // wrapper.innerHTML = template(this.#state);
        contextMenu.classList.add('context-menu');
        let menuItems: MenuItem[] = [];
        if (button === 0 && this.#options.generatePrimaryMenuItems) {
            menuItems = this.#options.generatePrimaryMenuItems();
        } else if (button === 2 && this.#options.generateSecondaryMenuItems) {
            menuItems = this.#options.generateSecondaryMenuItems();
        } else {
            menuItems = this.#state.defaultMenuItems;
        }
        if (this.#options.addCancel) {
            menuItems = this.#generateCancelItems().concat(menuItems);
        }
        for (const item of menuItems) {
            if (item === 'hr') {
                const hr = document.createElement('hr');
                contextMenu.appendChild(hr);
            } else {
                const menuItem = document.createElement('div');
                menuItem.classList.add('menu-item');
                const label = document.createElement('span');
                label.classList.add('label');
                label.textContent = item.label;
                menuItem.appendChild(label);
                contextMenu.appendChild(menuItem);
                this.#bindCallbacks(menuItem, item);
            }
        }

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

    #removeExistingContextMenu = (): void => {
        document.querySelector(".context-menu")?.remove();
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
                this.#removeExistingContextMenu();
            }
        };
    };

    #onShowContextMenu = (event: MouseEvent): void => {
        event.preventDefault();
        event.stopPropagation();

        // store event so it can be passed to callbakcs
        this.#initialContextMenuEvent = event;

        // the current context menu should disappear when a new one is displayed
        this.#removeExistingContextMenu();

        // build and show on ui
        const contextMenu: HTMLElement = this.#buildContextMenu(event.button);
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

        if (clickedTarget.closest("[context-menu]")) {
            return;
        }
        this.#removeExistingContextMenu();
    };

    constructor(configurableOptions: ConfigurableOptions) {
        this.updateOptions(configurableOptions);

        this.#state.defaultMenuItems = this.#options.defaultMenuItems;

        // bind the required event listeners
        this.#options.scope.oncontextmenu = this.#onShowContextMenu;
        this.#options.scope.onclick  = this.#onShowContextMenu;

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
}
