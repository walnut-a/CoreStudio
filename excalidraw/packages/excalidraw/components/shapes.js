"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findShapeByKey = exports.getToolbarTools = exports.SHAPES = void 0;
const common_1 = require("@excalidraw/common");
const icons_1 = require("./icons");
exports.SHAPES = [
    {
        icon: icons_1.handIcon,
        value: "hand",
        key: common_1.KEYS.H,
        numericKey: null,
        fillable: false,
        toolbar: true,
    },
    {
        icon: icons_1.SelectionIcon,
        value: "selection",
        key: common_1.KEYS.V,
        numericKey: common_1.KEYS["1"],
        fillable: true,
        toolbar: true,
    },
    {
        icon: icons_1.RectangleIcon,
        value: "rectangle",
        key: common_1.KEYS.R,
        numericKey: common_1.KEYS["2"],
        fillable: true,
        toolbar: true,
    },
    {
        icon: icons_1.DiamondIcon,
        value: "diamond",
        key: common_1.KEYS.D,
        numericKey: common_1.KEYS["3"],
        fillable: true,
        toolbar: true,
    },
    {
        icon: icons_1.EllipseIcon,
        value: "ellipse",
        key: common_1.KEYS.O,
        numericKey: common_1.KEYS["4"],
        fillable: true,
        toolbar: true,
    },
    {
        icon: icons_1.ArrowIcon,
        value: "arrow",
        key: common_1.KEYS.A,
        numericKey: common_1.KEYS["5"],
        fillable: true,
        toolbar: true,
    },
    {
        icon: icons_1.LineIcon,
        value: "line",
        key: common_1.KEYS.L,
        numericKey: common_1.KEYS["6"],
        fillable: true,
        toolbar: true,
    },
    {
        icon: icons_1.FreedrawIcon,
        value: "freedraw",
        key: [common_1.KEYS.P, common_1.KEYS.X],
        numericKey: common_1.KEYS["7"],
        fillable: false,
        toolbar: true,
    },
    {
        icon: icons_1.TextIcon,
        value: "text",
        key: common_1.KEYS.T,
        numericKey: common_1.KEYS["8"],
        fillable: false,
        toolbar: true,
    },
    {
        icon: icons_1.ImageIcon,
        value: "image",
        key: null,
        numericKey: common_1.KEYS["9"],
        fillable: false,
        toolbar: true,
    },
    {
        icon: icons_1.EraserIcon,
        value: "eraser",
        key: common_1.KEYS.E,
        numericKey: common_1.KEYS["0"],
        fillable: false,
        toolbar: true,
    },
    {
        icon: icons_1.laserPointerToolIcon,
        value: "laser",
        key: common_1.KEYS.K,
        numericKey: null,
        fillable: false,
        toolbar: false,
    },
];
const getToolbarTools = (app) => {
    return app.state.preferredSelectionTool.type === "lasso"
        ? [
            {
                value: "lasso",
                icon: icons_1.SelectionIcon,
                key: common_1.KEYS.V,
                numericKey: common_1.KEYS["1"],
                fillable: true,
                toolbar: true,
            },
            ...exports.SHAPES.slice(1),
        ]
        : exports.SHAPES;
};
exports.getToolbarTools = getToolbarTools;
const findShapeByKey = (key, app) => {
    const shape = (0, exports.getToolbarTools)(app).find((shape, index) => {
        return ((shape.numericKey != null && key === shape.numericKey.toString()) ||
            (shape.key &&
                (typeof shape.key === "string"
                    ? shape.key === key
                    : shape.key.includes(key))));
    });
    return shape?.value || null;
};
exports.findShapeByKey = findShapeByKey;
