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
var _ContextMenu_instances, _ContextMenu_initialContextMenuEvent, _ContextMenu_state, _ContextMenu_contextMenuElement, _ContextMenu_coreOptions, _ContextMenu_defaultOptions, _ContextMenu_options, _ContextMenu_generateCancelItems, _ContextMenu_buildContextMenu, _ContextMenu_normalizePozition, _ContextMenu_applyStyleOnContextMenu, _ContextMenu_bindCallbacks, _ContextMenu_onShowContextMenu, _ContextMenu_onDocumentClick;
class ContextMenu {
    constructor(configurableOptions) {
        _ContextMenu_instances.add(this);
        // private vars
        _ContextMenu_initialContextMenuEvent.set(this, void 0);
        _ContextMenu_state.set(this, { defaultMenuItems: [] });
        _ContextMenu_contextMenuElement.set(this, null);
        _ContextMenu_coreOptions.set(this, {
            transformOrigin: ['top', 'left'],
        });
        _ContextMenu_defaultOptions.set(this, {
            theme: 'black',
            transitionDuration: 200,
            additionalScopeClass: "selected",
            addCancel: true,
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
            let menuItems = [];
            if (button === 0 && __classPrivateFieldGet(this, _ContextMenu_options, "f").generatePrimaryMenuItems) {
                menuItems = __classPrivateFieldGet(this, _ContextMenu_options, "f").generatePrimaryMenuItems();
            }
            else if (button === 2 && __classPrivateFieldGet(this, _ContextMenu_options, "f").generateSecondaryMenuItems) {
                menuItems = __classPrivateFieldGet(this, _ContextMenu_options, "f").generateSecondaryMenuItems();
            }
            else {
                menuItems = __classPrivateFieldGet(this, _ContextMenu_state, "f").defaultMenuItems;
            }
            if (__classPrivateFieldGet(this, _ContextMenu_options, "f").addCancel) {
                menuItems = __classPrivateFieldGet(this, _ContextMenu_instances, "m", _ContextMenu_generateCancelItems).call(this).concat(menuItems);
            }
            for (const item of menuItems) {
                if (item === 'hr') {
                    const hr = document.createElement('hr');
                    contextMenu.appendChild(hr);
                }
                else {
                    const menuItem = document.createElement('div');
                    menuItem.classList.add('menu-item');
                    const label = document.createElement('span');
                    label.classList.add('label');
                    label.textContent = item.label;
                    menuItem.appendChild(label);
                    contextMenu.appendChild(menuItem);
                    __classPrivateFieldGet(this, _ContextMenu_bindCallbacks, "f").call(this, menuItem, item);
                }
            }
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
            if (clickedTarget.closest("[context-menu]")) {
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
}
_ContextMenu_initialContextMenuEvent = new WeakMap(), _ContextMenu_state = new WeakMap(), _ContextMenu_contextMenuElement = new WeakMap(), _ContextMenu_coreOptions = new WeakMap(), _ContextMenu_defaultOptions = new WeakMap(), _ContextMenu_options = new WeakMap(), _ContextMenu_buildContextMenu = new WeakMap(), _ContextMenu_normalizePozition = new WeakMap(), _ContextMenu_applyStyleOnContextMenu = new WeakMap(), _ContextMenu_bindCallbacks = new WeakMap(), _ContextMenu_onShowContextMenu = new WeakMap(), _ContextMenu_onDocumentClick = new WeakMap(), _ContextMenu_instances = new WeakSet(), _ContextMenu_generateCancelItems = function _ContextMenu_generateCancelItems() {
    return [
        {
            label: 'Close Menu',
            callback: () => { },
            preventCloseOnClick: false,
        },
        "hr"
    ];
};
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
