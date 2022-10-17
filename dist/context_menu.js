var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var _ContextMenu_instances, _ContextMenu_initialContextMenuEvent, _ContextMenu_state, _ContextMenu_contextMenuElement, _ContextMenu_titleElement, _ContextMenu_currentMenuOptions, _ContextMenu_coreOptions, _ContextMenu_defaultOptions, _ContextMenu_options, _ContextMenu_generateCloseButton, _ContextMenu_generateTitleElement, _ContextMenu_generateTooltipElement, _ContextMenu_generateSlider, _ContextMenu_updateMenuItems, _ContextMenu_generateMenuItem, _ContextMenu_buildContextMenu, _ContextMenu_normalizePozition, _ContextMenu_applyStyleOnContextMenu, _ContextMenu_showDescription, _ContextMenu_hideDescription, _ContextMenu_bindCallbacks, _ContextMenu_onShowContextMenu, _ContextMenu_onDocumentClick;
class ContextMenu {
    constructor(configurableOptions) {
        _ContextMenu_instances.add(this);
        // private vars
        _ContextMenu_initialContextMenuEvent.set(this, void 0);
        _ContextMenu_state.set(this, { defaultMenuItems: [] });
        _ContextMenu_contextMenuElement.set(this, null);
        _ContextMenu_titleElement.set(this, null);
        _ContextMenu_currentMenuOptions.set(this, null);
        _ContextMenu_coreOptions.set(this, {
            transformOrigin: ['top', 'left'],
        });
        _ContextMenu_defaultOptions.set(this, {
            theme: 'black',
            transitionDuration: 200,
            additionalScopeClass: "selected",
        });
        // will be populated in constructor
        //@ts-ignore
        _ContextMenu_options.set(this, {});
        /**
         * Create the context menu with menu items
         */
        _ContextMenu_buildContextMenu.set(this, (button) => {
            const contextMenu = document.createElement('div');
            // wrapper.innerHTML = template(this.#state);
            contextMenu.classList.add('context-menu');
            contextMenu.appendChild(__classPrivateFieldGet(this, _ContextMenu_instances, "m", _ContextMenu_generateCloseButton).call(this));
            let menuItems;
            let menuOptionElements = [];
            let title = "";
            if (button === 0 && __classPrivateFieldGet(this, _ContextMenu_options, "f").generatePrimaryMenuItems) {
                const instanceOptions = __classPrivateFieldGet(this, _ContextMenu_options, "f").generatePrimaryMenuItems(ContextMenu.sliderValue);
                menuItems = instanceOptions.items;
                title = instanceOptions.title;
            }
            else if (button === 2 && __classPrivateFieldGet(this, _ContextMenu_options, "f").generateSecondaryMenuItems) {
                const instanceOptions = __classPrivateFieldGet(this, _ContextMenu_options, "f").generateSecondaryMenuItems(ContextMenu.sliderValue);
                menuItems = instanceOptions.items;
                title = instanceOptions.title;
            }
            else {
                menuItems = __classPrivateFieldGet(this, _ContextMenu_state, "f").defaultMenuItems;
            }
            contextMenu.appendChild(__classPrivateFieldGet(this, _ContextMenu_instances, "m", _ContextMenu_generateTitleElement).call(this, title));
            for (const item of menuItems) {
                if (item === 'hr') {
                    const hr = document.createElement('hr');
                    contextMenu.appendChild(hr);
                }
                else if (item === 'slider') {
                    contextMenu.appendChild(__classPrivateFieldGet(this, _ContextMenu_instances, "m", _ContextMenu_generateSlider).call(this));
                }
                else {
                    const menuItem = __classPrivateFieldGet(this, _ContextMenu_instances, "m", _ContextMenu_generateMenuItem).call(this, item);
                    menuOptionElements.push({ option: item, element: menuItem });
                    contextMenu.appendChild(menuItem);
                }
            }
            __classPrivateFieldSet(this, _ContextMenu_currentMenuOptions, menuOptionElements, "f");
            // const contextMenu: HTMLElement = wrapper.children[0] as HTMLElement;
            return contextMenu;
        });
        /**
         * Normalize the context menu position so that it won't get out of bounds
         * @param mouseX
         * @param mouseY
         * @param contextMenu
         */
        _ContextMenu_normalizePozition.set(this, (mouseX, mouseY, contextMenu) => {
            const scope = __classPrivateFieldGet(this, _ContextMenu_options, "f").scope;
            // compute what is the mouse position relative to the container element (scope)
            const { left: scopeOffsetX, top: scopeOffsetY, } = scope.getBoundingClientRect();
            const scopeX = mouseX - scopeOffsetX;
            const scopeY = mouseY - scopeOffsetY;
            // check if the element will go out of bounds
            const outOfBoundsOnX = false; // always stay left
            // scopeX + contextMenu.clientWidth > scope.clientWidth;
            const outOfBoundsOnY = false; // always stay top
            // scopeY + contextMenu.clientHeight > scope.clientHeight;
            let normalizedX = mouseX;
            let normalizedY = mouseY;
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
        });
        _ContextMenu_applyStyleOnContextMenu.set(this, (contextMenu, outOfBoundsOnX, outOfBoundsOnY) => {
            // transition duration
            contextMenu.style.transitionDuration = `${__classPrivateFieldGet(this, _ContextMenu_options, "f").transitionDuration}ms`;
            // set the transition origin based on it's position
            const transformOrigin = Array.from(__classPrivateFieldGet(this, _ContextMenu_options, "f").transformOrigin);
            outOfBoundsOnX && (transformOrigin[1] = 'right');
            outOfBoundsOnY && (transformOrigin[0] = 'bottom');
            contextMenu.style.transformOrigin = transformOrigin.join(' ');
            // apply theme or custom css style
            if (__classPrivateFieldGet(this, _ContextMenu_options, "f").customThemeClass) {
                contextMenu.classList.add(__classPrivateFieldGet(this, _ContextMenu_options, "f").customThemeClass);
            }
            else {
                contextMenu.classList.add("context-menu--" + __classPrivateFieldGet(this, _ContextMenu_options, "f").theme + "-theme");
            }
            __classPrivateFieldGet(this, _ContextMenu_options, "f").customClass &&
                contextMenu.classList.add(__classPrivateFieldGet(this, _ContextMenu_options, "f").customClass);
        });
        _ContextMenu_showDescription.set(this, (desc) => {
            var _a;
            const tooltip = __classPrivateFieldGet(this, _ContextMenu_instances, "m", _ContextMenu_generateTooltipElement).call(this, desc);
            (_a = __classPrivateFieldGet(this, _ContextMenu_contextMenuElement, "f")) === null || _a === void 0 ? void 0 : _a.appendChild(tooltip);
        });
        _ContextMenu_hideDescription.set(this, () => {
            const tooltip = document.querySelector('.tooltip');
            if (tooltip) {
                tooltip.remove();
            }
        });
        _ContextMenu_bindCallbacks.set(this, (htmlEl, menuOption) => {
            htmlEl.onclick = () => {
                var _a, _b;
                if (!__classPrivateFieldGet(this, _ContextMenu_initialContextMenuEvent, "f")) {
                    return;
                }
                menuOption.callback(__classPrivateFieldGet(this, _ContextMenu_initialContextMenuEvent, "f"));
                // global value for all menu items, or the individual option or false
                const preventCloseOnClick = (_b = (_a = menuOption.preventCloseOnClick) !== null && _a !== void 0 ? _a : __classPrivateFieldGet(this, _ContextMenu_options, "f").preventCloseOnClick) !== null && _b !== void 0 ? _b : false;
                if (!preventCloseOnClick) {
                    ContextMenu.removeExistingContextMenu();
                }
            };
            if (menuOption.description) {
                htmlEl.title = menuOption.description;
                // htmlEl.onmouseover = () => {
                //     this.#showDescription(menuOption.description!);
                // };
                // htmlEl.onmouseout = () => {
                //     this.#hideDescription();
                // };
            }
        });
        _ContextMenu_onShowContextMenu.set(this, (event) => {
            var _a;
            event.preventDefault();
            event.stopPropagation();
            // store event so it can be passed to callbacks
            __classPrivateFieldSet(this, _ContextMenu_initialContextMenuEvent, event, "f");
            // the current context menu should disappear when a new one is displayed
            ContextMenu.removeExistingContextMenu();
            ContextMenu.currentContextMenu = this;
            // build and show on ui
            const contextMenu = __classPrivateFieldGet(this, _ContextMenu_buildContextMenu, "f").call(this, event.button);
            __classPrivateFieldSet(this, _ContextMenu_contextMenuElement, contextMenu, "f");
            (_a = document.querySelector('body')) === null || _a === void 0 ? void 0 : _a.append(contextMenu);
            // set the position
            const { clientX: mouseX, clientY: mouseY } = event;
            const { normalizedX, normalizedY } = __classPrivateFieldGet(this, _ContextMenu_normalizePozition, "f").call(this, mouseX, mouseY, contextMenu);
            contextMenu.style.top = `${normalizedY}px`;
            contextMenu.style.left = `${normalizedX}px`;
            // apply the css configurable style
            __classPrivateFieldGet(this, _ContextMenu_applyStyleOnContextMenu, "f").call(this, contextMenu, mouseX !== normalizedX, mouseY !== normalizedY);
            if (__classPrivateFieldGet(this, _ContextMenu_options, "f").additionalScopeClass) {
                __classPrivateFieldGet(this, _ContextMenu_options, "f").scope.classList.add(__classPrivateFieldGet(this, _ContextMenu_options, "f").additionalScopeClass);
            }
            if (__classPrivateFieldGet(this, _ContextMenu_options, "f").onShow) {
                __classPrivateFieldGet(this, _ContextMenu_options, "f").onShow();
            }
            // disable context menu for it
            contextMenu.oncontextmenu = (e) => e.preventDefault();
            // bind the callbacks on each option
            // this.#bindCallbacks(contextMenu);
            // make it visible but wait an event loop to pass
            setTimeout(() => {
                contextMenu.classList.add('visible');
            });
        });
        /**
         * Used to determine if the user has clicked outside of the context menu and if so to close it
         * @param event
         */
        _ContextMenu_onDocumentClick.set(this, (event) => {
            const clickedTarget = event.target;
            if (clickedTarget.closest(".context-menu")) {
                return;
            }
            ContextMenu.removeExistingContextMenu();
        });
        this.updateOptions(configurableOptions);
        __classPrivateFieldGet(this, _ContextMenu_state, "f").defaultMenuItems = __classPrivateFieldGet(this, _ContextMenu_options, "f").defaultMenuItems;
        // bind the required event listeners
        __classPrivateFieldGet(this, _ContextMenu_options, "f").scope.oncontextmenu = __classPrivateFieldGet(this, _ContextMenu_onShowContextMenu, "f");
        __classPrivateFieldGet(this, _ContextMenu_options, "f").scope.onclick = __classPrivateFieldGet(this, _ContextMenu_onShowContextMenu, "f");
        // add a click event listener to create a modal effect for the context menu and close it if the user clicks outside of it
        document.addEventListener('click', __classPrivateFieldGet(this, _ContextMenu_onDocumentClick, "f"));
    }
    // Public methods (API)
    /**
     * Remove all the event listeners that were registered for this feature
     */
    off() {
        document.removeEventListener('click', __classPrivateFieldGet(this, _ContextMenu_onDocumentClick, "f"));
        __classPrivateFieldGet(this, _ContextMenu_options, "f").scope.oncontextmenu = null;
    }
    updateOptions(configurableOptions) {
        // extend default options and bind the menu items inside the state for pug template
        Object.assign(__classPrivateFieldGet(this, _ContextMenu_options, "f"), __classPrivateFieldGet(this, _ContextMenu_defaultOptions, "f"));
        Object.assign(__classPrivateFieldGet(this, _ContextMenu_options, "f"), configurableOptions);
        Object.assign(__classPrivateFieldGet(this, _ContextMenu_options, "f"), __classPrivateFieldGet(this, _ContextMenu_coreOptions, "f"));
        __classPrivateFieldGet(this, _ContextMenu_state, "f").defaultMenuItems = __classPrivateFieldGet(this, _ContextMenu_options, "f").defaultMenuItems;
    }
    updateTitle(title) {
        __classPrivateFieldGet(this, _ContextMenu_titleElement, "f").innerText = title;
    }
}
_ContextMenu_initialContextMenuEvent = new WeakMap(), _ContextMenu_state = new WeakMap(), _ContextMenu_contextMenuElement = new WeakMap(), _ContextMenu_titleElement = new WeakMap(), _ContextMenu_currentMenuOptions = new WeakMap(), _ContextMenu_coreOptions = new WeakMap(), _ContextMenu_defaultOptions = new WeakMap(), _ContextMenu_options = new WeakMap(), _ContextMenu_buildContextMenu = new WeakMap(), _ContextMenu_normalizePozition = new WeakMap(), _ContextMenu_applyStyleOnContextMenu = new WeakMap(), _ContextMenu_showDescription = new WeakMap(), _ContextMenu_hideDescription = new WeakMap(), _ContextMenu_bindCallbacks = new WeakMap(), _ContextMenu_onShowContextMenu = new WeakMap(), _ContextMenu_onDocumentClick = new WeakMap(), _ContextMenu_instances = new WeakSet(), _ContextMenu_generateCloseButton = function _ContextMenu_generateCloseButton() {
    const close_button = document.createElement('button');
    close_button.textContent = "X";
    close_button.classList.add('context-menu-close-button');
    close_button.addEventListener('click', () => {
        ContextMenu.removeExistingContextMenu();
    });
    return close_button;
}, _ContextMenu_generateTitleElement = function _ContextMenu_generateTitleElement(initial_title) {
    const title = document.createElement('div');
    title.classList.add('context-menu-title');
    __classPrivateFieldSet(this, _ContextMenu_titleElement, document.createElement('span'), "f");
    __classPrivateFieldGet(this, _ContextMenu_titleElement, "f").classList.add('context-menu-title-text');
    __classPrivateFieldGet(this, _ContextMenu_titleElement, "f").innerText = initial_title;
    title.appendChild(__classPrivateFieldGet(this, _ContextMenu_titleElement, "f"));
    return title;
}, _ContextMenu_generateTooltipElement = function _ContextMenu_generateTooltipElement(description) {
    const tooltip = document.createElement('div');
    tooltip.classList.add('context-menu-tooltip');
    tooltip.innerText = description;
    return tooltip;
}, _ContextMenu_generateSlider = function _ContextMenu_generateSlider() {
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
        ContextMenu.sliderValue = parseFloat(ev.target.value);
        __classPrivateFieldGet(this, _ContextMenu_instances, "m", _ContextMenu_updateMenuItems).call(this, ContextMenu.sliderValue);
        // Update the menu options to reflect new cost/amount
    });
    slider_container.appendChild(min_label);
    slider_container.appendChild(slider);
    slider_container.appendChild(max_label);
    return slider_container;
}, _ContextMenu_updateMenuItems = function _ContextMenu_updateMenuItems(slider_value) {
    let newMenuOptions = [];
    for (const item of __classPrivateFieldGet(this, _ContextMenu_currentMenuOptions, "f")) {
        if (item.option.sliderCallback) {
            const new_option = item.option.sliderCallback(slider_value);
            const new_element = __classPrivateFieldGet(this, _ContextMenu_instances, "m", _ContextMenu_generateMenuItem).call(this, new_option);
            newMenuOptions.push({
                option: item.option,
                element: new_element,
            });
            item.element.replaceWith(new_element);
        }
        else {
            newMenuOptions.push(item);
        }
    }
    __classPrivateFieldSet(this, _ContextMenu_currentMenuOptions, newMenuOptions, "f");
}, _ContextMenu_generateMenuItem = function _ContextMenu_generateMenuItem(option) {
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
        __classPrivateFieldGet(this, _ContextMenu_bindCallbacks, "f").call(this, menuItem, option);
    }
    return menuItem;
};
// 0 = 1, 0.5 = 1/2 Max, 1 = Max,
ContextMenu.sliderValue = 0.5;
ContextMenu.removeExistingContextMenu = () => {
    var _a;
    if (!ContextMenu.currentContextMenu) {
        return;
    }
    const c = ContextMenu.currentContextMenu;
    if (__classPrivateFieldGet(c, _ContextMenu_options, "f").additionalScopeClass) {
        __classPrivateFieldGet(c, _ContextMenu_options, "f").scope.classList.remove(__classPrivateFieldGet(c, _ContextMenu_options, "f").additionalScopeClass);
    }
    if (__classPrivateFieldGet(c, _ContextMenu_options, "f").onClose) {
        __classPrivateFieldGet(c, _ContextMenu_options, "f").onClose();
    }
    (_a = __classPrivateFieldGet(c, _ContextMenu_contextMenuElement, "f")) === null || _a === void 0 ? void 0 : _a.remove();
    __classPrivateFieldSet(c, _ContextMenu_contextMenuElement, null, "f");
};
