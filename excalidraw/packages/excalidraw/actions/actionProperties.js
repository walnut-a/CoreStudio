"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.actionChangeArrowType = exports.actionChangeArrowProperties = exports.actionChangeArrowhead = exports.actionChangeRoundness = exports.actionChangeVerticalAlign = exports.actionChangeTextAlign = exports.actionChangeFontFamily = exports.actionIncreaseFontSize = exports.actionDecreaseFontSize = exports.actionChangeFontSize = exports.actionChangeOpacity = exports.actionChangeStrokeStyle = exports.actionChangeSloppiness = exports.actionChangeStrokeWidth = exports.actionChangeFillStyle = exports.actionChangeBackgroundColor = exports.actionChangeStrokeColor = exports.getFormValue = exports.changeProperty = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const math_1 = require("@excalidraw/math");
const react_1 = require("react");
const common_1 = require("@excalidraw/common");
const element_1 = require("@excalidraw/element");
const element_2 = require("@excalidraw/element");
const element_3 = require("@excalidraw/element");
const element_4 = require("@excalidraw/element");
const element_5 = require("@excalidraw/element");
const element_6 = require("@excalidraw/element");
const element_7 = require("@excalidraw/element");
const element_8 = require("@excalidraw/element");
const element_9 = require("@excalidraw/element");
const common_2 = require("@excalidraw/common");
const analytics_1 = require("../analytics");
const RadioSelection_1 = require("../components/RadioSelection");
const ColorPicker_1 = require("../components/ColorPicker/ColorPicker");
const FontPicker_1 = require("../components/FontPicker/FontPicker");
const IconPicker_1 = require("../components/IconPicker");
const Range_1 = require("../components/Range");
const icons_1 = require("../components/icons");
const fonts_1 = require("../fonts");
const i18n_1 = require("../i18n");
const scene_1 = require("../scene");
const useTextEditorFocus_1 = require("../hooks/useTextEditorFocus");
const shortcut_1 = require("../shortcut");
const register_1 = require("./register");
const FONT_SIZE_RELATIVE_INCREASE_STEP = 0.1;
const getStylesPanelInfo = (app) => {
    const stylesPanelMode = (0, common_2.deriveStylesPanelMode)(app.editorInterface);
    return {
        stylesPanelMode,
        isCompact: stylesPanelMode !== "full",
        isMobile: stylesPanelMode === "mobile",
    };
};
const changeProperty = (elements, appState, callback, includeBoundText = false) => {
    const selectedElementIds = (0, common_1.arrayToMap)((0, scene_1.getSelectedElements)(elements, appState, {
        includeBoundTextElement: includeBoundText,
    }));
    return elements.map((element) => {
        if (selectedElementIds.get(element.id) ||
            element.id === appState.editingTextElement?.id) {
            return callback(element);
        }
        return element;
    });
};
exports.changeProperty = changeProperty;
const getFormValue = function (elements, app, getAttribute, elementPredicate, defaultValue) {
    const editingTextElement = app.state.editingTextElement;
    const nonDeletedElements = (0, element_1.getNonDeletedElements)(elements);
    let ret = null;
    if (editingTextElement) {
        ret = getAttribute(editingTextElement);
    }
    if (!ret) {
        const hasSelection = (0, scene_1.isSomeElementSelected)(nonDeletedElements, app.state);
        if (hasSelection) {
            const selectedElements = app.scene.getSelectedElements(app.state);
            const targetElements = elementPredicate === true
                ? selectedElements
                : selectedElements.filter((el) => elementPredicate(el));
            ret =
                (0, common_1.reduceToCommonValue)(targetElements, getAttribute) ??
                    (typeof defaultValue === "function"
                        ? defaultValue(true)
                        : defaultValue);
        }
        else {
            ret =
                typeof defaultValue === "function" ? defaultValue(false) : defaultValue;
        }
    }
    return ret;
};
exports.getFormValue = getFormValue;
const offsetElementAfterFontResize = (prevElement, nextElement, scene) => {
    if ((0, element_7.isBoundToContainer)(nextElement) || !nextElement.autoResize) {
        return nextElement;
    }
    return scene.mutateElement(nextElement, {
        x: prevElement.textAlign === "left"
            ? prevElement.x
            : prevElement.x +
                (prevElement.width - nextElement.width) /
                    (prevElement.textAlign === "center" ? 2 : 1),
        // centering vertically is non-standard, but for Excalidraw I think
        // it makes sense
        y: prevElement.y + (prevElement.height - nextElement.height) / 2,
    });
};
const changeFontSize = (elements, appState, app, getNewFontSize, fallbackValue) => {
    const newFontSizes = new Set();
    const updatedElements = (0, exports.changeProperty)(elements, appState, (oldElement) => {
        if ((0, element_7.isTextElement)(oldElement)) {
            const newFontSize = getNewFontSize(oldElement);
            newFontSizes.add(newFontSize);
            let newElement = (0, element_4.newElementWith)(oldElement, {
                fontSize: newFontSize,
            });
            (0, element_6.redrawTextBoundingBox)(newElement, app.scene.getContainerElement(oldElement), app.scene);
            newElement = offsetElementAfterFontResize(oldElement, newElement, app.scene);
            return newElement;
        }
        return oldElement;
    }, true);
    // Update arrow elements after text elements have been updated
    (0, scene_1.getSelectedElements)(elements, appState, {
        includeBoundTextElement: true,
    }).forEach((element) => {
        if ((0, element_7.isTextElement)(element)) {
            (0, element_2.updateBoundElements)(element, app.scene);
        }
    });
    return {
        elements: updatedElements,
        appState: {
            ...appState,
            // update state only if we've set all select text elements to
            // the same font size
            currentItemFontSize: newFontSizes.size === 1
                ? [...newFontSizes][0]
                : fallbackValue ?? appState.currentItemFontSize,
        },
        captureUpdate: element_9.CaptureUpdateAction.IMMEDIATELY,
    };
};
// -----------------------------------------------------------------------------
exports.actionChangeStrokeColor = (0, register_1.register)({
    name: "changeStrokeColor",
    label: "labels.stroke",
    trackEvent: false,
    perform: (elements, appState, value) => {
        return {
            ...(value?.currentItemStrokeColor && {
                elements: (0, exports.changeProperty)(elements, appState, (el) => {
                    return (0, element_8.hasStrokeColor)(el.type)
                        ? (0, element_4.newElementWith)(el, {
                            strokeColor: value.currentItemStrokeColor,
                        })
                        : el;
                }, true),
            }),
            appState: {
                ...appState,
                ...value,
            },
            captureUpdate: !!value?.currentItemStrokeColor
                ? element_9.CaptureUpdateAction.IMMEDIATELY
                : element_9.CaptureUpdateAction.EVENTUALLY,
        };
    },
    PanelComponent: ({ elements, appState, updateData, app, data }) => {
        const { stylesPanelMode } = getStylesPanelInfo(app);
        return ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [stylesPanelMode === "full" && ((0, jsx_runtime_1.jsx)("h3", { "aria-hidden": "true", children: (0, i18n_1.t)("labels.stroke") })), (0, jsx_runtime_1.jsx)(ColorPicker_1.ColorPicker, { topPicks: common_1.DEFAULT_ELEMENT_STROKE_PICKS, palette: common_1.DEFAULT_ELEMENT_STROKE_COLOR_PALETTE, type: "elementStroke", label: (0, i18n_1.t)("labels.stroke"), color: (0, exports.getFormValue)(elements, app, (element) => element.strokeColor, true, (hasSelection) => !hasSelection ? appState.currentItemStrokeColor : null), onChange: (color) => updateData({ currentItemStrokeColor: color }), elements: elements, appState: appState, updateData: updateData })] }));
    },
});
exports.actionChangeBackgroundColor = (0, register_1.register)({
    name: "changeBackgroundColor",
    label: "labels.changeBackground",
    trackEvent: false,
    perform: (elements, appState, value, app) => {
        if (!value?.currentItemBackgroundColor) {
            return {
                appState: {
                    ...appState,
                    ...value,
                },
                captureUpdate: element_9.CaptureUpdateAction.EVENTUALLY,
            };
        }
        let nextElements;
        const selectedElements = app.scene.getSelectedElements(appState);
        const shouldEnablePolygon = !(0, common_1.isTransparent)(value.currentItemBackgroundColor) &&
            selectedElements.every((el) => (0, element_7.isLineElement)(el) && (0, element_1.canBecomePolygon)(el.points));
        if (shouldEnablePolygon) {
            const selectedElementsMap = (0, common_1.arrayToMap)(selectedElements);
            nextElements = elements.map((el) => {
                if (selectedElementsMap.has(el.id) && (0, element_7.isLineElement)(el)) {
                    return (0, element_4.newElementWith)(el, {
                        backgroundColor: value.currentItemBackgroundColor,
                        ...(0, element_9.toggleLinePolygonState)(el, true),
                    });
                }
                return el;
            });
        }
        else {
            nextElements = (0, exports.changeProperty)(elements, appState, (el) => (0, element_4.newElementWith)(el, {
                backgroundColor: value.currentItemBackgroundColor,
            }));
        }
        return {
            elements: nextElements,
            appState: {
                ...appState,
                ...value,
            },
            captureUpdate: element_9.CaptureUpdateAction.IMMEDIATELY,
        };
    },
    PanelComponent: ({ elements, appState, updateData, app, data }) => {
        const { stylesPanelMode } = getStylesPanelInfo(app);
        return ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [stylesPanelMode === "full" && ((0, jsx_runtime_1.jsx)("h3", { "aria-hidden": "true", children: (0, i18n_1.t)("labels.background") })), (0, jsx_runtime_1.jsx)(ColorPicker_1.ColorPicker, { topPicks: common_1.DEFAULT_ELEMENT_BACKGROUND_PICKS, palette: common_1.DEFAULT_ELEMENT_BACKGROUND_COLOR_PALETTE, type: "elementBackground", label: (0, i18n_1.t)("labels.background"), color: (0, exports.getFormValue)(elements, app, (element) => element.backgroundColor, true, (hasSelection) => !hasSelection ? appState.currentItemBackgroundColor : null), onChange: (color) => updateData({ currentItemBackgroundColor: color }), elements: elements, appState: appState, updateData: updateData })] }));
    },
});
exports.actionChangeFillStyle = (0, register_1.register)({
    name: "changeFillStyle",
    label: "labels.fill",
    trackEvent: false,
    perform: (elements, appState, value, app) => {
        (0, analytics_1.trackEvent)("element", "changeFillStyle", `${value} (${app.editorInterface.formFactor === "phone" ? "mobile" : "desktop"})`);
        return {
            elements: (0, exports.changeProperty)(elements, appState, (el) => (0, element_4.newElementWith)(el, {
                fillStyle: value,
            })),
            appState: { ...appState, currentItemFillStyle: value },
            captureUpdate: element_9.CaptureUpdateAction.IMMEDIATELY,
        };
    },
    PanelComponent: ({ elements, appState, updateData, app }) => {
        const selectedElements = (0, scene_1.getSelectedElements)(elements, appState);
        const allElementsZigZag = selectedElements.length > 0 &&
            selectedElements.every((el) => el.fillStyle === "zigzag");
        return ((0, jsx_runtime_1.jsxs)("fieldset", { children: [(0, jsx_runtime_1.jsx)("legend", { children: (0, i18n_1.t)("labels.fill") }), (0, jsx_runtime_1.jsx)("div", { className: "buttonList", children: (0, jsx_runtime_1.jsx)(RadioSelection_1.RadioSelection, { type: "button", options: [
                            {
                                value: "hachure",
                                text: `${allElementsZigZag ? (0, i18n_1.t)("labels.zigzag") : (0, i18n_1.t)("labels.hachure")} (${(0, shortcut_1.getShortcutKey)("Alt-Click")})`,
                                icon: allElementsZigZag ? icons_1.FillZigZagIcon : icons_1.FillHachureIcon,
                                active: allElementsZigZag ? true : undefined,
                                testId: `fill-hachure`,
                            },
                            {
                                value: "cross-hatch",
                                text: (0, i18n_1.t)("labels.crossHatch"),
                                icon: icons_1.FillCrossHatchIcon,
                                testId: `fill-cross-hatch`,
                            },
                            {
                                value: "solid",
                                text: (0, i18n_1.t)("labels.solid"),
                                icon: icons_1.FillSolidIcon,
                                testId: `fill-solid`,
                            },
                        ], value: (0, exports.getFormValue)(elements, app, (element) => element.fillStyle, (element) => element.hasOwnProperty("fillStyle"), (hasSelection) => hasSelection ? null : appState.currentItemFillStyle), onClick: (value, event) => {
                            const nextValue = event.altKey &&
                                value === "hachure" &&
                                selectedElements.every((el) => el.fillStyle === "hachure")
                                ? "zigzag"
                                : value;
                            updateData(nextValue);
                        } }) })] }));
    },
});
exports.actionChangeStrokeWidth = (0, register_1.register)({
    name: "changeStrokeWidth",
    label: "labels.strokeWidth",
    trackEvent: false,
    perform: (elements, appState, value) => {
        return {
            elements: (0, exports.changeProperty)(elements, appState, (el) => (0, element_4.newElementWith)(el, {
                strokeWidth: value,
            })),
            appState: { ...appState, currentItemStrokeWidth: value },
            captureUpdate: element_9.CaptureUpdateAction.IMMEDIATELY,
        };
    },
    PanelComponent: ({ elements, appState, updateData, app, data }) => ((0, jsx_runtime_1.jsxs)("fieldset", { children: [(0, jsx_runtime_1.jsx)("legend", { children: (0, i18n_1.t)("labels.strokeWidth") }), (0, jsx_runtime_1.jsx)("div", { className: "buttonList", children: (0, jsx_runtime_1.jsx)(RadioSelection_1.RadioSelection, { group: "stroke-width", options: [
                        {
                            value: common_1.STROKE_WIDTH.thin,
                            text: (0, i18n_1.t)("labels.thin"),
                            icon: icons_1.StrokeWidthBaseIcon,
                            testId: "strokeWidth-thin",
                        },
                        {
                            value: common_1.STROKE_WIDTH.bold,
                            text: (0, i18n_1.t)("labels.bold"),
                            icon: icons_1.StrokeWidthBoldIcon,
                            testId: "strokeWidth-bold",
                        },
                        {
                            value: common_1.STROKE_WIDTH.extraBold,
                            text: (0, i18n_1.t)("labels.extraBold"),
                            icon: icons_1.StrokeWidthExtraBoldIcon,
                            testId: "strokeWidth-extraBold",
                        },
                    ], value: (0, exports.getFormValue)(elements, app, (element) => element.strokeWidth, (element) => element.hasOwnProperty("strokeWidth"), (hasSelection) => hasSelection ? null : appState.currentItemStrokeWidth), onChange: (value) => updateData(value) }) })] })),
});
exports.actionChangeSloppiness = (0, register_1.register)({
    name: "changeSloppiness",
    label: "labels.sloppiness",
    trackEvent: false,
    perform: (elements, appState, value) => {
        return {
            elements: (0, exports.changeProperty)(elements, appState, (el) => (0, element_4.newElementWith)(el, {
                seed: (0, common_1.randomInteger)(),
                roughness: value,
            })),
            appState: { ...appState, currentItemRoughness: value },
            captureUpdate: element_9.CaptureUpdateAction.IMMEDIATELY,
        };
    },
    PanelComponent: ({ elements, appState, updateData, app, data }) => ((0, jsx_runtime_1.jsxs)("fieldset", { children: [(0, jsx_runtime_1.jsx)("legend", { children: (0, i18n_1.t)("labels.sloppiness") }), (0, jsx_runtime_1.jsx)("div", { className: "buttonList", children: (0, jsx_runtime_1.jsx)(RadioSelection_1.RadioSelection, { group: "sloppiness", options: [
                        {
                            value: 0,
                            text: (0, i18n_1.t)("labels.architect"),
                            icon: icons_1.SloppinessArchitectIcon,
                        },
                        {
                            value: 1,
                            text: (0, i18n_1.t)("labels.artist"),
                            icon: icons_1.SloppinessArtistIcon,
                        },
                        {
                            value: 2,
                            text: (0, i18n_1.t)("labels.cartoonist"),
                            icon: icons_1.SloppinessCartoonistIcon,
                        },
                    ], value: (0, exports.getFormValue)(elements, app, (element) => element.roughness, (element) => element.hasOwnProperty("roughness"), (hasSelection) => hasSelection ? null : appState.currentItemRoughness), onChange: (value) => updateData(value) }) })] })),
});
exports.actionChangeStrokeStyle = (0, register_1.register)({
    name: "changeStrokeStyle",
    label: "labels.strokeStyle",
    trackEvent: false,
    perform: (elements, appState, value) => {
        return {
            elements: (0, exports.changeProperty)(elements, appState, (el) => (0, element_4.newElementWith)(el, {
                strokeStyle: value,
            })),
            appState: { ...appState, currentItemStrokeStyle: value },
            captureUpdate: element_9.CaptureUpdateAction.IMMEDIATELY,
        };
    },
    PanelComponent: ({ elements, appState, updateData, app, data }) => ((0, jsx_runtime_1.jsxs)("fieldset", { children: [(0, jsx_runtime_1.jsx)("legend", { children: (0, i18n_1.t)("labels.strokeStyle") }), (0, jsx_runtime_1.jsx)("div", { className: "buttonList", children: (0, jsx_runtime_1.jsx)(RadioSelection_1.RadioSelection, { group: "strokeStyle", options: [
                        {
                            value: "solid",
                            text: (0, i18n_1.t)("labels.strokeStyle_solid"),
                            icon: icons_1.StrokeWidthBaseIcon,
                        },
                        {
                            value: "dashed",
                            text: (0, i18n_1.t)("labels.strokeStyle_dashed"),
                            icon: icons_1.StrokeStyleDashedIcon,
                        },
                        {
                            value: "dotted",
                            text: (0, i18n_1.t)("labels.strokeStyle_dotted"),
                            icon: icons_1.StrokeStyleDottedIcon,
                        },
                    ], value: (0, exports.getFormValue)(elements, app, (element) => element.strokeStyle, (element) => element.hasOwnProperty("strokeStyle"), (hasSelection) => hasSelection ? null : appState.currentItemStrokeStyle), onChange: (value) => updateData(value) }) })] })),
});
exports.actionChangeOpacity = (0, register_1.register)({
    name: "changeOpacity",
    label: "labels.opacity",
    trackEvent: false,
    perform: (elements, appState, value) => {
        return {
            elements: (0, exports.changeProperty)(elements, appState, (el) => (0, element_4.newElementWith)(el, {
                opacity: value,
            }), true),
            appState: { ...appState, currentItemOpacity: value },
            captureUpdate: element_9.CaptureUpdateAction.IMMEDIATELY,
        };
    },
    PanelComponent: ({ elements, appState, app, updateData }) => {
        const opacity = (0, exports.getFormValue)(elements, app, (element) => element.opacity, true, (hasSelection) => (hasSelection ? null : appState.currentItemOpacity));
        return ((0, jsx_runtime_1.jsx)(Range_1.Range, { label: (0, i18n_1.t)("labels.opacity"), value: opacity ?? appState.currentItemOpacity, hasCommonValue: opacity !== null, onChange: updateData, min: 0, max: 100, step: 10, testId: "opacity" }));
    },
});
exports.actionChangeFontSize = (0, register_1.register)({
    name: "changeFontSize",
    label: "labels.fontSize",
    trackEvent: false,
    perform: (elements, appState, value, app) => {
        return changeFontSize(elements, appState, app, () => {
            (0, common_1.invariant)(value, "actionChangeFontSize: Expected a font size value");
            return value;
        }, value);
    },
    PanelComponent: ({ elements, appState, updateData, app, data }) => {
        const { isCompact } = getStylesPanelInfo(app);
        return ((0, jsx_runtime_1.jsxs)("fieldset", { children: [(0, jsx_runtime_1.jsx)("legend", { children: (0, i18n_1.t)("labels.fontSize") }), (0, jsx_runtime_1.jsx)("div", { className: "buttonList", children: (0, jsx_runtime_1.jsx)(RadioSelection_1.RadioSelection, { group: "font-size", options: [
                            {
                                value: common_1.FONT_SIZES.sm,
                                text: (0, i18n_1.t)("labels.small"),
                                icon: icons_1.FontSizeSmallIcon,
                                testId: "fontSize-small",
                            },
                            {
                                value: common_1.FONT_SIZES.md,
                                text: (0, i18n_1.t)("labels.medium"),
                                icon: icons_1.FontSizeMediumIcon,
                                testId: "fontSize-medium",
                            },
                            {
                                value: common_1.FONT_SIZES.lg,
                                text: (0, i18n_1.t)("labels.large"),
                                icon: icons_1.FontSizeLargeIcon,
                                testId: "fontSize-large",
                            },
                            {
                                value: common_1.FONT_SIZES.xl,
                                text: (0, i18n_1.t)("labels.veryLarge"),
                                icon: icons_1.FontSizeExtraLargeIcon,
                                testId: "fontSize-veryLarge",
                            },
                        ], value: (0, exports.getFormValue)(elements, app, (element) => {
                            if ((0, element_7.isTextElement)(element)) {
                                return element.fontSize;
                            }
                            const boundTextElement = (0, element_6.getBoundTextElement)(element, app.scene.getNonDeletedElementsMap());
                            if (boundTextElement) {
                                return boundTextElement.fontSize;
                            }
                            return null;
                        }, (element) => (0, element_7.isTextElement)(element) ||
                            (0, element_6.getBoundTextElement)(element, app.scene.getNonDeletedElementsMap()) !== null, (hasSelection) => hasSelection
                            ? null
                            : appState.currentItemFontSize || common_1.DEFAULT_FONT_SIZE), onChange: (value) => {
                            (0, useTextEditorFocus_1.withCaretPositionPreservation)(() => updateData(value), isCompact, !!appState.editingTextElement, data?.onPreventClose);
                        } }) })] }));
    },
});
exports.actionDecreaseFontSize = (0, register_1.register)({
    name: "decreaseFontSize",
    label: "labels.decreaseFontSize",
    icon: icons_1.fontSizeIcon,
    trackEvent: false,
    perform: (elements, appState, value, app) => {
        return changeFontSize(elements, appState, app, (element) => Math.round(
        // get previous value before relative increase (doesn't work fully
        // due to rounding and float precision issues)
        (1 / (1 + FONT_SIZE_RELATIVE_INCREASE_STEP)) * element.fontSize));
    },
    keyTest: (event) => {
        return (event[common_1.KEYS.CTRL_OR_CMD] &&
            event.shiftKey &&
            // KEYS.COMMA needed for MacOS
            (event.key === common_1.KEYS.CHEVRON_LEFT || event.key === common_1.KEYS.COMMA));
    },
});
exports.actionIncreaseFontSize = (0, register_1.register)({
    name: "increaseFontSize",
    label: "labels.increaseFontSize",
    icon: icons_1.fontSizeIcon,
    trackEvent: false,
    perform: (elements, appState, value, app) => {
        return changeFontSize(elements, appState, app, (element) => Math.round(element.fontSize * (1 + FONT_SIZE_RELATIVE_INCREASE_STEP)));
    },
    keyTest: (event) => {
        return (event[common_1.KEYS.CTRL_OR_CMD] &&
            event.shiftKey &&
            // KEYS.PERIOD needed for MacOS
            (event.key === common_1.KEYS.CHEVRON_RIGHT || event.key === common_1.KEYS.PERIOD));
    },
});
exports.actionChangeFontFamily = (0, register_1.register)({
    name: "changeFontFamily",
    label: "labels.fontFamily",
    trackEvent: false,
    perform: (elements, appState, value, app) => {
        const { cachedElements, resetAll, resetContainers, ...nextAppState } = value;
        if (resetAll) {
            const nextElements = (0, exports.changeProperty)(elements, appState, (element) => {
                const cachedElement = cachedElements?.get(element.id);
                if (cachedElement) {
                    const newElement = (0, element_4.newElementWith)(element, {
                        ...cachedElement,
                    });
                    return newElement;
                }
                return element;
            }, true);
            return {
                elements: nextElements,
                appState: {
                    ...appState,
                    ...nextAppState,
                },
                captureUpdate: element_9.CaptureUpdateAction.NEVER,
            };
        }
        (0, common_1.invariant)(value, "actionChangeFontFamily: value must be defined");
        const { currentItemFontFamily, currentHoveredFontFamily } = value;
        let nextCaptureUpdateAction = element_9.CaptureUpdateAction.EVENTUALLY;
        let nextFontFamily;
        let skipOnHoverRender = false;
        if (currentItemFontFamily) {
            nextFontFamily = currentItemFontFamily;
            nextCaptureUpdateAction = element_9.CaptureUpdateAction.IMMEDIATELY;
        }
        else if (currentHoveredFontFamily) {
            nextFontFamily = currentHoveredFontFamily;
            nextCaptureUpdateAction = element_9.CaptureUpdateAction.EVENTUALLY;
            const selectedTextElements = (0, scene_1.getSelectedElements)(elements, appState, {
                includeBoundTextElement: true,
            }).filter((element) => (0, element_7.isTextElement)(element));
            // skip on hover re-render for more than 200 text elements or for text element with more than 5000 chars combined
            if (selectedTextElements.length > 200) {
                skipOnHoverRender = true;
            }
            else {
                let i = 0;
                let textLengthAccumulator = 0;
                while (i < selectedTextElements.length &&
                    textLengthAccumulator < 5000) {
                    const textElement = selectedTextElements[i];
                    textLengthAccumulator += textElement?.originalText.length || 0;
                    i++;
                }
                if (textLengthAccumulator > 5000) {
                    skipOnHoverRender = true;
                }
            }
        }
        const result = {
            appState: {
                ...appState,
                ...nextAppState,
            },
            captureUpdate: nextCaptureUpdateAction,
        };
        if (nextFontFamily && !skipOnHoverRender) {
            const elementContainerMapping = new Map();
            let uniqueChars = new Set();
            let skipFontFaceCheck = false;
            const fontsCache = Array.from(fonts_1.Fonts.loadedFontsCache.values());
            const fontFamily = Object.entries(common_1.FONT_FAMILY).find(([_, value]) => value === nextFontFamily)?.[0];
            // skip `document.font.check` check on hover, if at least one font family has loaded as it's super slow (could result in slightly different bbox, which is fine)
            if (currentHoveredFontFamily &&
                fontFamily &&
                fontsCache.some((sig) => sig.startsWith(fontFamily))) {
                skipFontFaceCheck = true;
            }
            // following causes re-render so make sure we changed the family
            // otherwise it could cause unexpected issues, such as preventing opening the popover when in wysiwyg
            Object.assign(result, {
                elements: (0, exports.changeProperty)(elements, appState, (oldElement) => {
                    if ((0, element_7.isTextElement)(oldElement) &&
                        (oldElement.fontFamily !== nextFontFamily ||
                            currentItemFontFamily) // force update on selection
                    ) {
                        const newElement = (0, element_4.newElementWith)(oldElement, {
                            fontFamily: nextFontFamily,
                            lineHeight: (0, common_1.getLineHeight)(nextFontFamily),
                        });
                        const cachedContainer = cachedElements?.get(oldElement.containerId || "") || {};
                        const container = app.scene.getContainerElement(oldElement);
                        if (resetContainers && container && cachedContainer) {
                            // reset the container back to it's cached version
                            app.scene.mutateElement(container, { ...cachedContainer });
                        }
                        if (!skipFontFaceCheck) {
                            uniqueChars = new Set([
                                ...uniqueChars,
                                ...Array.from(newElement.originalText),
                            ]);
                        }
                        elementContainerMapping.set(newElement, container);
                        return newElement;
                    }
                    return oldElement;
                }, true),
            });
            // size is irrelevant, but necessary
            const fontString = `10px ${(0, common_1.getFontFamilyString)({
                fontFamily: nextFontFamily,
            })}`;
            const chars = Array.from(uniqueChars.values()).join();
            if (skipFontFaceCheck || window.document.fonts.check(fontString, chars)) {
                // we either skip the check (have at least one font face loaded) or do the check and find out all the font faces have loaded
                for (const [element, container] of elementContainerMapping) {
                    // trigger synchronous redraw
                    (0, element_6.redrawTextBoundingBox)(element, container, app.scene);
                }
            }
            else {
                // otherwise try to load all font faces for the given chars and redraw elements once our font faces loaded
                window.document.fonts.load(fontString, chars).then((fontFaces) => {
                    for (const [element, container] of elementContainerMapping) {
                        // use latest element state to ensure we don't have closure over an old instance in order to avoid possible race conditions (i.e. font faces load out-of-order while rapidly switching fonts)
                        const latestElement = app.scene.getElement(element.id);
                        const latestContainer = container
                            ? app.scene.getElement(container.id)
                            : null;
                        if (latestElement) {
                            // trigger async redraw
                            (0, element_6.redrawTextBoundingBox)(latestElement, latestContainer, app.scene);
                        }
                    }
                    // trigger update once we've mutated all the elements, which also updates our cache
                    app.fonts.onLoaded(fontFaces);
                });
            }
        }
        return result;
    },
    PanelComponent: ({ elements, appState, app, updateData }) => {
        const cachedElementsRef = (0, react_1.useRef)(new Map());
        const prevSelectedFontFamilyRef = (0, react_1.useRef)(null);
        // relying on state batching as multiple `FontPicker` handlers could be called in rapid succession and we want to combine them
        const [batchedData, setBatchedData] = (0, react_1.useState)({});
        const isUnmounted = (0, react_1.useRef)(true);
        const { stylesPanelMode, isCompact } = getStylesPanelInfo(app);
        const selectedFontFamily = (0, react_1.useMemo)(() => {
            const getFontFamily = (elementsArray, elementsMap) => (0, exports.getFormValue)(elementsArray, app, (element) => {
                if ((0, element_7.isTextElement)(element)) {
                    return element.fontFamily;
                }
                const boundTextElement = (0, element_6.getBoundTextElement)(element, elementsMap);
                if (boundTextElement) {
                    return boundTextElement.fontFamily;
                }
                return null;
            }, (element) => (0, element_7.isTextElement)(element) ||
                (0, element_6.getBoundTextElement)(element, elementsMap) !== null, (hasSelection) => hasSelection
                ? null
                : appState.currentItemFontFamily || common_1.DEFAULT_FONT_FAMILY);
            // popup opened, use cached elements
            if (batchedData.openPopup === "fontFamily" &&
                appState.openPopup === "fontFamily") {
                return getFontFamily(Array.from(cachedElementsRef.current?.values() ?? []), cachedElementsRef.current);
            }
            // popup closed, use all elements
            if (!batchedData.openPopup && appState.openPopup !== "fontFamily") {
                return getFontFamily(elements, app.scene.getNonDeletedElementsMap());
            }
            // popup props are not in sync, hence we are in the middle of an update, so keeping the previous value we've had
            return prevSelectedFontFamilyRef.current;
        }, [batchedData.openPopup, appState, elements, app]);
        (0, react_1.useEffect)(() => {
            prevSelectedFontFamilyRef.current = selectedFontFamily;
        }, [selectedFontFamily]);
        (0, react_1.useEffect)(() => {
            if (Object.keys(batchedData).length) {
                updateData(batchedData);
                // reset the data after we've used the data
                setBatchedData({});
            }
            // call update only on internal state changes
            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [batchedData]);
        (0, react_1.useEffect)(() => {
            isUnmounted.current = false;
            return () => {
                isUnmounted.current = true;
            };
        }, []);
        return ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [stylesPanelMode === "full" && ((0, jsx_runtime_1.jsx)("legend", { children: (0, i18n_1.t)("labels.fontFamily") })), (0, jsx_runtime_1.jsx)(FontPicker_1.FontPicker, { isOpened: appState.openPopup === "fontFamily", selectedFontFamily: selectedFontFamily, hoveredFontFamily: appState.currentHoveredFontFamily, compactMode: stylesPanelMode !== "full", onSelect: (fontFamily) => {
                        (0, useTextEditorFocus_1.withCaretPositionPreservation)(() => {
                            setBatchedData({
                                openPopup: null,
                                currentHoveredFontFamily: null,
                                currentItemFontFamily: fontFamily,
                            });
                            // defensive clear so immediate close won't abuse the cached elements
                            cachedElementsRef.current.clear();
                        }, isCompact, !!appState.editingTextElement);
                    }, onHover: (fontFamily) => {
                        setBatchedData({
                            currentHoveredFontFamily: fontFamily,
                            cachedElements: new Map(cachedElementsRef.current),
                            resetContainers: true,
                        });
                    }, onLeave: () => {
                        setBatchedData({
                            currentHoveredFontFamily: null,
                            cachedElements: new Map(cachedElementsRef.current),
                            resetAll: true,
                        });
                    }, onPopupChange: (open) => {
                        if (open) {
                            // open, populate the cache from scratch
                            cachedElementsRef.current.clear();
                            const { editingTextElement } = appState;
                            // still check type to be safe
                            if (editingTextElement?.type === "text") {
                                // retrieve the latest version from the scene, as `editingTextElement` isn't mutated
                                const latesteditingTextElement = app.scene.getElement(editingTextElement.id);
                                // inside the wysiwyg editor
                                cachedElementsRef.current.set(editingTextElement.id, (0, element_4.newElementWith)(latesteditingTextElement || editingTextElement, {}, true));
                            }
                            else {
                                const selectedElements = (0, scene_1.getSelectedElements)(elements, appState, {
                                    includeBoundTextElement: true,
                                });
                                for (const element of selectedElements) {
                                    cachedElementsRef.current.set(element.id, (0, element_4.newElementWith)(element, {}, true));
                                }
                            }
                            setBatchedData({
                                ...batchedData,
                                openPopup: "fontFamily",
                            });
                        }
                        else {
                            const fontFamilyData = {
                                currentHoveredFontFamily: null,
                                cachedElements: new Map(cachedElementsRef.current),
                                resetAll: true,
                            };
                            setBatchedData({
                                ...fontFamilyData,
                            });
                            cachedElementsRef.current.clear();
                            // Refocus text editor when font picker closes if we were editing text
                            if (isCompact && appState.editingTextElement) {
                                (0, useTextEditorFocus_1.restoreCaretPosition)(null); // Just refocus without saved position
                            }
                        }
                    } })] }));
    },
});
exports.actionChangeTextAlign = (0, register_1.register)({
    name: "changeTextAlign",
    label: "Change text alignment",
    trackEvent: false,
    perform: (elements, appState, value, app) => {
        return {
            elements: (0, exports.changeProperty)(elements, appState, (oldElement) => {
                if ((0, element_7.isTextElement)(oldElement)) {
                    const newElement = (0, element_4.newElementWith)(oldElement, { textAlign: value });
                    (0, element_6.redrawTextBoundingBox)(newElement, app.scene.getContainerElement(oldElement), app.scene);
                    return newElement;
                }
                return oldElement;
            }, true),
            appState: {
                ...appState,
                currentItemTextAlign: value,
            },
            captureUpdate: element_9.CaptureUpdateAction.IMMEDIATELY,
        };
    },
    PanelComponent: ({ elements, appState, updateData, app, data }) => {
        const elementsMap = app.scene.getNonDeletedElementsMap();
        const { isCompact } = getStylesPanelInfo(app);
        return ((0, jsx_runtime_1.jsxs)("fieldset", { children: [(0, jsx_runtime_1.jsx)("legend", { children: (0, i18n_1.t)("labels.textAlign") }), (0, jsx_runtime_1.jsx)("div", { className: "buttonList", children: (0, jsx_runtime_1.jsx)(RadioSelection_1.RadioSelection, { group: "text-align", options: [
                            {
                                value: "left",
                                text: (0, i18n_1.t)("labels.left"),
                                icon: icons_1.TextAlignLeftIcon,
                                testId: "align-left",
                            },
                            {
                                value: "center",
                                text: (0, i18n_1.t)("labels.center"),
                                icon: icons_1.TextAlignCenterIcon,
                                testId: "align-horizontal-center",
                            },
                            {
                                value: "right",
                                text: (0, i18n_1.t)("labels.right"),
                                icon: icons_1.TextAlignRightIcon,
                                testId: "align-right",
                            },
                        ], value: (0, exports.getFormValue)(elements, app, (element) => {
                            if ((0, element_7.isTextElement)(element)) {
                                return element.textAlign;
                            }
                            const boundTextElement = (0, element_6.getBoundTextElement)(element, elementsMap);
                            if (boundTextElement) {
                                return boundTextElement.textAlign;
                            }
                            return null;
                        }, (element) => (0, element_7.isTextElement)(element) ||
                            (0, element_6.getBoundTextElement)(element, elementsMap) !== null, (hasSelection) => hasSelection ? null : appState.currentItemTextAlign), onChange: (value) => {
                            (0, useTextEditorFocus_1.withCaretPositionPreservation)(() => updateData(value), isCompact, !!appState.editingTextElement, data?.onPreventClose);
                        } }) })] }));
    },
});
exports.actionChangeVerticalAlign = (0, register_1.register)({
    name: "changeVerticalAlign",
    label: "Change vertical alignment",
    trackEvent: { category: "element" },
    perform: (elements, appState, value, app) => {
        return {
            elements: (0, exports.changeProperty)(elements, appState, (oldElement) => {
                if ((0, element_7.isTextElement)(oldElement)) {
                    const newElement = (0, element_4.newElementWith)(oldElement, { verticalAlign: value });
                    (0, element_6.redrawTextBoundingBox)(newElement, app.scene.getContainerElement(oldElement), app.scene);
                    return newElement;
                }
                return oldElement;
            }, true),
            appState: {
                ...appState,
            },
            captureUpdate: element_9.CaptureUpdateAction.IMMEDIATELY,
        };
    },
    PanelComponent: ({ elements, appState, updateData, app, data }) => {
        const { isCompact } = getStylesPanelInfo(app);
        return ((0, jsx_runtime_1.jsx)("fieldset", { children: (0, jsx_runtime_1.jsx)("div", { className: "buttonList", children: (0, jsx_runtime_1.jsx)(RadioSelection_1.RadioSelection, { group: "text-align", options: [
                        {
                            value: common_1.VERTICAL_ALIGN.TOP,
                            text: (0, i18n_1.t)("labels.alignTop"),
                            icon: (0, jsx_runtime_1.jsx)(icons_1.TextAlignTopIcon, { theme: appState.theme }),
                            testId: "align-top",
                        },
                        {
                            value: common_1.VERTICAL_ALIGN.MIDDLE,
                            text: (0, i18n_1.t)("labels.centerVertically"),
                            icon: (0, jsx_runtime_1.jsx)(icons_1.TextAlignMiddleIcon, { theme: appState.theme }),
                            testId: "align-middle",
                        },
                        {
                            value: common_1.VERTICAL_ALIGN.BOTTOM,
                            text: (0, i18n_1.t)("labels.alignBottom"),
                            icon: (0, jsx_runtime_1.jsx)(icons_1.TextAlignBottomIcon, { theme: appState.theme }),
                            testId: "align-bottom",
                        },
                    ], value: (0, exports.getFormValue)(elements, app, (element) => {
                        if ((0, element_7.isTextElement)(element) && element.containerId) {
                            return element.verticalAlign;
                        }
                        const boundTextElement = (0, element_6.getBoundTextElement)(element, app.scene.getNonDeletedElementsMap());
                        if (boundTextElement) {
                            return boundTextElement.verticalAlign;
                        }
                        return null;
                    }, (element) => (0, element_7.isTextElement)(element) ||
                        (0, element_6.getBoundTextElement)(element, app.scene.getNonDeletedElementsMap()) !== null, (hasSelection) => (hasSelection ? null : common_1.VERTICAL_ALIGN.MIDDLE)), onChange: (value) => {
                        (0, useTextEditorFocus_1.withCaretPositionPreservation)(() => updateData(value), isCompact, !!appState.editingTextElement, data?.onPreventClose);
                    } }) }) }));
    },
});
exports.actionChangeRoundness = (0, register_1.register)({
    name: "changeRoundness",
    label: "Change edge roundness",
    trackEvent: false,
    perform: (elements, appState, value) => {
        return {
            elements: (0, exports.changeProperty)(elements, appState, (el) => {
                if ((0, element_7.isElbowArrow)(el)) {
                    return el;
                }
                return (0, element_4.newElementWith)(el, {
                    roundness: value === "round"
                        ? {
                            type: (0, element_7.isUsingAdaptiveRadius)(el.type)
                                ? common_1.ROUNDNESS.ADAPTIVE_RADIUS
                                : common_1.ROUNDNESS.PROPORTIONAL_RADIUS,
                        }
                        : null,
                });
            }),
            appState: {
                ...appState,
                currentItemRoundness: value,
            },
            captureUpdate: element_9.CaptureUpdateAction.IMMEDIATELY,
        };
    },
    PanelComponent: ({ elements, appState, updateData, app, renderAction }) => {
        const targetElements = (0, scene_1.getTargetElements)((0, element_1.getNonDeletedElements)(elements), appState);
        const hasLegacyRoundness = targetElements.some((el) => el.roundness?.type === common_1.ROUNDNESS.LEGACY);
        return ((0, jsx_runtime_1.jsxs)("fieldset", { children: [(0, jsx_runtime_1.jsx)("legend", { children: (0, i18n_1.t)("labels.edges") }), (0, jsx_runtime_1.jsxs)("div", { className: "buttonList", children: [(0, jsx_runtime_1.jsx)(RadioSelection_1.RadioSelection, { group: "edges", options: [
                                {
                                    value: "sharp",
                                    text: (0, i18n_1.t)("labels.sharp"),
                                    icon: icons_1.EdgeSharpIcon,
                                },
                                {
                                    value: "round",
                                    text: (0, i18n_1.t)("labels.round"),
                                    icon: icons_1.EdgeRoundIcon,
                                },
                            ], value: (0, exports.getFormValue)(elements, app, (element) => hasLegacyRoundness
                                ? null
                                : element.roundness
                                    ? "round"
                                    : "sharp", (element) => !(0, element_7.isArrowElement)(element) && element.hasOwnProperty("roundness"), (hasSelection) => hasSelection ? null : appState.currentItemRoundness), onChange: (value) => updateData(value) }), renderAction("togglePolygon")] })] }));
    },
});
const getArrowheadOptions = (flip) => {
    return {
        visibleSections: [
            {
                name: "default",
                options: [
                    {
                        value: null,
                        text: (0, i18n_1.t)("labels.arrowhead_none"),
                        keyBinding: "q",
                        icon: (0, jsx_runtime_1.jsx)(icons_1.ArrowheadNoneIcon, { flip: flip }),
                    },
                    {
                        value: "arrow",
                        text: (0, i18n_1.t)("labels.arrowhead_arrow"),
                        keyBinding: "w",
                        icon: (0, jsx_runtime_1.jsx)(icons_1.ArrowheadArrowIcon, { flip: flip }),
                    },
                    {
                        value: "triangle",
                        text: (0, i18n_1.t)("labels.arrowhead_triangle"),
                        icon: (0, jsx_runtime_1.jsx)(icons_1.ArrowheadTriangleIcon, { flip: flip }),
                        keyBinding: "e",
                    },
                    {
                        value: "triangle_outline",
                        text: (0, i18n_1.t)("labels.arrowhead_triangle_outline"),
                        icon: (0, jsx_runtime_1.jsx)(icons_1.ArrowheadTriangleOutlineIcon, { flip: flip }),
                        keyBinding: "r",
                    },
                ],
            },
        ],
        hiddenSections: [
            {
                name: "default",
                options: [
                    {
                        value: "circle",
                        text: (0, i18n_1.t)("labels.arrowhead_circle"),
                        keyBinding: "a",
                        icon: (0, jsx_runtime_1.jsx)(icons_1.ArrowheadCircleIcon, { flip: flip }),
                    },
                    {
                        value: "circle_outline",
                        text: (0, i18n_1.t)("labels.arrowhead_circle_outline"),
                        keyBinding: "s",
                        icon: (0, jsx_runtime_1.jsx)(icons_1.ArrowheadCircleOutlineIcon, { flip: flip }),
                    },
                    {
                        value: "diamond",
                        text: (0, i18n_1.t)("labels.arrowhead_diamond"),
                        icon: (0, jsx_runtime_1.jsx)(icons_1.ArrowheadDiamondIcon, { flip: flip }),
                        keyBinding: "d",
                    },
                    {
                        value: "diamond_outline",
                        text: (0, i18n_1.t)("labels.arrowhead_diamond_outline"),
                        icon: (0, jsx_runtime_1.jsx)(icons_1.ArrowheadDiamondOutlineIcon, { flip: flip }),
                        keyBinding: "f",
                    },
                    {
                        value: "bar",
                        text: (0, i18n_1.t)("labels.arrowhead_bar"),
                        keyBinding: "z",
                        icon: (0, jsx_runtime_1.jsx)(icons_1.ArrowheadBarIcon, { flip: flip }),
                    },
                ],
            },
            {
                name: (0, i18n_1.t)("labels.cardinality"),
                options: [
                    {
                        value: "cardinality_one",
                        text: (0, i18n_1.t)("labels.arrowhead_cardinality_one"),
                        icon: (0, jsx_runtime_1.jsx)(icons_1.ArrowheadCardinalityOneIcon, { flip: flip }),
                        keyBinding: "x",
                    },
                    {
                        value: "cardinality_many",
                        text: (0, i18n_1.t)("labels.arrowhead_cardinality_many"),
                        icon: (0, jsx_runtime_1.jsx)(icons_1.ArrowheadCardinalityManyIcon, { flip: flip }),
                        keyBinding: "c",
                    },
                    {
                        value: "cardinality_one_or_many",
                        text: (0, i18n_1.t)("labels.arrowhead_cardinality_one_or_many"),
                        icon: (0, jsx_runtime_1.jsx)(icons_1.ArrowheadCardinalityOneOrManyIcon, { flip: flip }),
                        keyBinding: "v",
                    },
                    {
                        value: "cardinality_exactly_one",
                        text: (0, i18n_1.t)("labels.arrowhead_cardinality_exactly_one"),
                        icon: (0, jsx_runtime_1.jsx)(icons_1.ArrowheadCardinalityExactlyOneIcon, { flip: flip }),
                        keyBinding: null,
                    },
                    {
                        value: "cardinality_zero_or_one",
                        text: (0, i18n_1.t)("labels.arrowhead_cardinality_zero_or_one"),
                        icon: (0, jsx_runtime_1.jsx)(icons_1.ArrowheadCardinalityZeroOrOneIcon, { flip: flip }),
                        keyBinding: null,
                    },
                    {
                        value: "cardinality_zero_or_many",
                        text: (0, i18n_1.t)("labels.arrowhead_cardinality_zero_or_many"),
                        icon: (0, jsx_runtime_1.jsx)(icons_1.ArrowheadCardinalityZeroOrManyIcon, { flip: flip }),
                        keyBinding: null,
                    },
                ],
            },
        ],
    };
};
exports.actionChangeArrowhead = (0, register_1.register)({
    name: "changeArrowhead",
    label: "Change arrowheads",
    trackEvent: false,
    perform: (elements, appState, value) => {
        (0, common_1.invariant)(value, "actionChangeArrowhead: value must be defined");
        return {
            elements: (0, exports.changeProperty)(elements, appState, (el) => {
                if ((0, element_7.isLinearElement)(el)) {
                    const { position, type } = value;
                    if (position === "start") {
                        const element = (0, element_4.newElementWith)(el, {
                            startArrowhead: type,
                        });
                        return element;
                    }
                    else if (position === "end") {
                        const element = (0, element_4.newElementWith)(el, {
                            endArrowhead: type,
                        });
                        return element;
                    }
                }
                return el;
            }),
            appState: {
                ...appState,
                [value.position === "start"
                    ? "currentItemStartArrowhead"
                    : "currentItemEndArrowhead"]: value.type,
            },
            captureUpdate: element_9.CaptureUpdateAction.IMMEDIATELY,
        };
    },
    PanelComponent: ({ elements, appState, updateData, app }) => {
        const isRTL = (0, i18n_1.getLanguage)().rtl;
        const startArrowheadOptions = (0, react_1.useMemo)(() => getArrowheadOptions(!isRTL), [isRTL]);
        const endArrowheadOptions = (0, react_1.useMemo)(() => getArrowheadOptions(!!isRTL), [isRTL]);
        return ((0, jsx_runtime_1.jsxs)("fieldset", { children: [(0, jsx_runtime_1.jsx)("legend", { children: (0, i18n_1.t)("labels.arrowheads") }), (0, jsx_runtime_1.jsxs)("div", { className: "iconSelectList buttonList", children: [(0, jsx_runtime_1.jsx)(IconPicker_1.IconPicker, { visibleSections: startArrowheadOptions.visibleSections, hiddenSections: startArrowheadOptions.hiddenSections, label: "arrowhead_start", value: (0, exports.getFormValue)(elements, app, (element) => (0, element_7.isLinearElement)(element) && (0, scene_1.canHaveArrowheads)(element.type)
                                ? (0, element_5.getArrowheadForPicker)(element.startArrowhead)
                                : appState.currentItemStartArrowhead, true, (hasSelection) => hasSelection ? null : appState.currentItemStartArrowhead), onChange: (value) => updateData({ position: "start", type: value }) }), (0, jsx_runtime_1.jsx)(IconPicker_1.IconPicker, { visibleSections: endArrowheadOptions.visibleSections, hiddenSections: endArrowheadOptions.hiddenSections, label: "arrowhead_end", value: (0, exports.getFormValue)(elements, app, (element) => (0, element_7.isLinearElement)(element) && (0, scene_1.canHaveArrowheads)(element.type)
                                ? (0, element_5.getArrowheadForPicker)(element.endArrowhead)
                                : appState.currentItemEndArrowhead, true, (hasSelection) => hasSelection ? null : appState.currentItemEndArrowhead), onChange: (value) => updateData({ position: "end", type: value }) })] })] }));
    },
});
exports.actionChangeArrowProperties = (0, register_1.register)({
    name: "changeArrowProperties",
    label: "Change arrow properties",
    trackEvent: false,
    perform: (elements, appState, value, app) => {
        // This action doesn't perform any changes directly
        // It's just a container for the arrow type and arrowhead actions
        return false;
    },
    PanelComponent: ({ elements, appState, updateData, app, renderAction }) => {
        return ((0, jsx_runtime_1.jsxs)("div", { className: "selected-shape-actions", children: [renderAction("changeArrowhead"), renderAction("changeArrowType")] }));
    },
});
exports.actionChangeArrowType = (0, register_1.register)({
    name: "changeArrowType",
    label: "Change arrow types",
    trackEvent: false,
    perform: (elements, appState, value, app) => {
        const newElements = (0, exports.changeProperty)(elements, appState, (el) => {
            if (!(0, element_7.isArrowElement)(el)) {
                return el;
            }
            const elementsMap = app.scene.getNonDeletedElementsMap();
            const startPoint = element_3.LinearElementEditor.getPointAtIndexGlobalCoordinates(el, 0, elementsMap);
            const endPoint = element_3.LinearElementEditor.getPointAtIndexGlobalCoordinates(el, -1, elementsMap);
            let newElement = (0, element_4.newElementWith)(el, {
                x: value === common_1.ARROW_TYPE.elbow ? startPoint[0] : el.x,
                y: value === common_1.ARROW_TYPE.elbow ? startPoint[1] : el.y,
                roundness: value === common_1.ARROW_TYPE.round
                    ? {
                        type: common_1.ROUNDNESS.PROPORTIONAL_RADIUS,
                    }
                    : null,
                elbowed: value === common_1.ARROW_TYPE.elbow,
                angle: value === common_1.ARROW_TYPE.elbow ? 0 : el.angle,
                points: value === common_1.ARROW_TYPE.elbow || el.elbowed
                    ? [
                        element_3.LinearElementEditor.pointFromAbsoluteCoords({
                            ...el,
                            x: startPoint[0],
                            y: startPoint[1],
                            angle: 0,
                        }, startPoint, elementsMap),
                        element_3.LinearElementEditor.pointFromAbsoluteCoords({
                            ...el,
                            x: startPoint[0],
                            y: startPoint[1],
                            angle: 0,
                        }, endPoint, elementsMap),
                    ]
                    : el.points,
            });
            if ((0, element_7.isElbowArrow)(newElement)) {
                newElement.fixedSegments = null;
                const elementsMap = app.scene.getNonDeletedElementsMap();
                app.dismissLinearEditor();
                const startGlobalPoint = element_3.LinearElementEditor.getPointAtIndexGlobalCoordinates(newElement, 0, elementsMap);
                const endGlobalPoint = element_3.LinearElementEditor.getPointAtIndexGlobalCoordinates(newElement, -1, elementsMap);
                const startElement = newElement.startBinding &&
                    elementsMap.get(newElement.startBinding.elementId);
                const endElement = newElement.endBinding &&
                    elementsMap.get(newElement.endBinding.elementId);
                const startBinding = startElement && newElement.startBinding
                    ? {
                        // @ts-ignore TS cannot discern check above
                        ...newElement.startBinding,
                        ...(0, element_2.calculateFixedPointForElbowArrowBinding)(newElement, startElement, "start", elementsMap, appState.isBindingEnabled),
                    }
                    : null;
                const endBinding = endElement && newElement.endBinding
                    ? {
                        // @ts-ignore TS cannot discern check above
                        ...newElement.endBinding,
                        ...(0, element_2.calculateFixedPointForElbowArrowBinding)(newElement, endElement, "end", elementsMap, appState.isBindingEnabled),
                    }
                    : null;
                newElement = {
                    ...newElement,
                    startBinding,
                    endBinding,
                    ...(0, element_9.updateElbowArrowPoints)(newElement, elementsMap, {
                        points: [startGlobalPoint, endGlobalPoint].map((p) => (0, math_1.pointFrom)(p[0] - newElement.x, p[1] - newElement.y)),
                        startBinding,
                        endBinding,
                        fixedSegments: null,
                    }),
                };
            }
            else {
                const elementsMap = app.scene.getNonDeletedElementsMap();
                if (newElement.startBinding) {
                    const startElement = elementsMap.get(newElement.startBinding.elementId);
                    if (startElement) {
                        (0, element_2.bindBindingElement)(newElement, startElement, appState.bindMode === "inside" ? "inside" : "orbit", "start", app.scene);
                    }
                }
                if (newElement.endBinding) {
                    const endElement = elementsMap.get(newElement.endBinding.elementId);
                    if (endElement) {
                        (0, element_2.bindBindingElement)(newElement, endElement, appState.bindMode === "inside" ? "inside" : "orbit", "end", app.scene);
                    }
                }
            }
            return newElement;
        });
        const newState = {
            ...appState,
            currentItemArrowType: value,
        };
        // Change the arrow type and update any other state settings for
        // the arrow.
        const selectedId = appState.selectedLinearElement?.elementId;
        if (selectedId) {
            const selected = newElements.find((el) => el.id === selectedId);
            if (selected) {
                newState.selectedLinearElement = new element_3.LinearElementEditor(selected, (0, common_1.arrayToMap)(elements));
            }
        }
        return {
            elements: newElements,
            appState: newState,
            captureUpdate: element_9.CaptureUpdateAction.IMMEDIATELY,
        };
    },
    PanelComponent: ({ elements, appState, updateData, app }) => {
        return ((0, jsx_runtime_1.jsxs)("fieldset", { children: [(0, jsx_runtime_1.jsx)("legend", { children: (0, i18n_1.t)("labels.arrowtypes") }), (0, jsx_runtime_1.jsx)("div", { className: "buttonList", children: (0, jsx_runtime_1.jsx)(RadioSelection_1.RadioSelection, { group: "arrowtypes", options: [
                            {
                                value: common_1.ARROW_TYPE.sharp,
                                text: (0, i18n_1.t)("labels.arrowtype_sharp"),
                                icon: icons_1.sharpArrowIcon,
                                testId: "sharp-arrow",
                            },
                            {
                                value: common_1.ARROW_TYPE.round,
                                text: (0, i18n_1.t)("labels.arrowtype_round"),
                                icon: icons_1.roundArrowIcon,
                                testId: "round-arrow",
                            },
                            {
                                value: common_1.ARROW_TYPE.elbow,
                                text: (0, i18n_1.t)("labels.arrowtype_elbowed"),
                                icon: icons_1.elbowArrowIcon,
                                testId: "elbow-arrow",
                            },
                        ], value: (0, exports.getFormValue)(elements, app, (element) => {
                            if ((0, element_7.isArrowElement)(element)) {
                                return element.elbowed
                                    ? common_1.ARROW_TYPE.elbow
                                    : element.roundness
                                        ? common_1.ARROW_TYPE.round
                                        : common_1.ARROW_TYPE.sharp;
                            }
                            return null;
                        }, (element) => (0, element_7.isArrowElement)(element), (hasSelection) => hasSelection ? null : appState.currentItemArrowType), onChange: (value) => updateData(value) }) })] }));
    },
});
