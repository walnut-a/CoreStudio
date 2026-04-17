"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
const element_1 = require("@excalidraw/element");
const common_1 = require("@excalidraw/common");
const react_dom_1 = require("react-dom");
const actions_1 = require("../actions");
const i18n_1 = require("../i18n");
require("./UnlockPopup.scss");
const icons_1 = require("./icons");
const UnlockPopup = ({ app, activeLockedId, }) => {
    const element = app.scene.getElement(activeLockedId);
    const elements = element
        ? [element]
        : (0, element_1.getElementsInGroup)(app.scene.getNonDeletedElementsMap(), activeLockedId);
    if (elements.length === 0) {
        return null;
    }
    const [x, y] = (0, element_1.getCommonBounds)(elements);
    const { x: viewX, y: viewY } = (0, common_1.sceneCoordsToViewportCoords)({ sceneX: x, sceneY: y }, app.state);
    return ((0, jsx_runtime_1.jsx)("div", { className: "UnlockPopup", style: {
            bottom: `${app.state.height + 12 - viewY + app.state.offsetTop}px`,
            left: `${viewX - app.state.offsetLeft}px`,
        }, onClick: () => {
            (0, react_dom_1.flushSync)(() => {
                const groupIds = (0, element_1.selectGroupsFromGivenElements)(elements, app.state);
                app.setState({
                    selectedElementIds: elements.reduce((acc, element) => ({
                        ...acc,
                        [element.id]: true,
                    }), {}),
                    selectedGroupIds: groupIds,
                    activeLockedId: null,
                });
            });
            app.actionManager.executeAction(actions_1.actionToggleElementLock);
        }, title: (0, i18n_1.t)("labels.elementLock.unlock"), children: icons_1.LockedIconFilled }));
};
exports.default = UnlockPopup;
