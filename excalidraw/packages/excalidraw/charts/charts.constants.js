"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.commonProps = exports.RADAR_LEGEND_TEXT_GAP = exports.RADAR_LEGEND_ITEM_GAP = exports.RADAR_LEGEND_SWATCH_SIZE = exports.RADAR_AXIS_LABEL_CLEARANCE = exports.RADAR_AXIS_LABEL_ALIGNMENT_THRESHOLD = exports.RADAR_AXIS_LABEL_MAX_WIDTH = exports.RADAR_SINGLE_SERIES_LOG_SCALE_THRESHOLD = exports.RADAR_PADDING = exports.RADAR_LABEL_OFFSET = exports.RADAR_GRID_LEVELS = exports.GRID_OPACITY = exports.BAR_HEIGHT = exports.BAR_GAP = exports.CARTESIAN_LABEL_OVERFLOW_PREFERENCE_BUFFER = exports.CARTESIAN_LABEL_ROTATED_WIDTH_BUFFER = exports.CARTESIAN_LABEL_MAX_WIDTH_BUFFER = exports.CARTESIAN_LABEL_AXIS_CLEARANCE = exports.CARTESIAN_LABEL_SLOT_PADDING = exports.CARTESIAN_LABEL_MIN_WIDTH = exports.CARTESIAN_LABEL_ROTATION = exports.CARTESIAN_LINE_HEIGHT = exports.CARTESIAN_BAR_HEIGHT = exports.CARTESIAN_GAP = exports.CARTESIAN_LINE_SLOT_WIDTH = exports.CARTESIAN_BAR_SLOT_EXTRA_MAX = exports.CARTESIAN_BAR_SLOT_EXTRA_PER_SERIES = exports.CARTESIAN_BASE_SLOT_WIDTH = void 0;
const common_1 = require("@excalidraw/common");
exports.CARTESIAN_BASE_SLOT_WIDTH = 44;
exports.CARTESIAN_BAR_SLOT_EXTRA_PER_SERIES = 22;
exports.CARTESIAN_BAR_SLOT_EXTRA_MAX = 66;
exports.CARTESIAN_LINE_SLOT_WIDTH = 48;
exports.CARTESIAN_GAP = 14;
exports.CARTESIAN_BAR_HEIGHT = 304;
exports.CARTESIAN_LINE_HEIGHT = 320;
exports.CARTESIAN_LABEL_ROTATION = 5.87;
exports.CARTESIAN_LABEL_MIN_WIDTH = 28;
exports.CARTESIAN_LABEL_SLOT_PADDING = 4;
exports.CARTESIAN_LABEL_AXIS_CLEARANCE = 2;
exports.CARTESIAN_LABEL_MAX_WIDTH_BUFFER = 10;
exports.CARTESIAN_LABEL_ROTATED_WIDTH_BUFFER = 10;
exports.CARTESIAN_LABEL_OVERFLOW_PREFERENCE_BUFFER = 8;
exports.BAR_GAP = 12;
exports.BAR_HEIGHT = 256;
exports.GRID_OPACITY = 10;
exports.RADAR_GRID_LEVELS = 4;
exports.RADAR_LABEL_OFFSET = exports.BAR_GAP * 2;
exports.RADAR_PADDING = exports.BAR_GAP * 2;
exports.RADAR_SINGLE_SERIES_LOG_SCALE_THRESHOLD = 100;
exports.RADAR_AXIS_LABEL_MAX_WIDTH = 140;
exports.RADAR_AXIS_LABEL_ALIGNMENT_THRESHOLD = 0.35;
exports.RADAR_AXIS_LABEL_CLEARANCE = exports.BAR_GAP / 2;
exports.RADAR_LEGEND_SWATCH_SIZE = 20;
exports.RADAR_LEGEND_ITEM_GAP = exports.BAR_GAP * 2;
exports.RADAR_LEGEND_TEXT_GAP = exports.BAR_GAP;
// Put all common chart element properties here so properties dialog
// shows stable values when selecting chart groups.
exports.commonProps = {
    fillStyle: "hachure",
    fontFamily: common_1.DEFAULT_FONT_FAMILY,
    fontSize: common_1.DEFAULT_FONT_SIZE,
    opacity: 100,
    roughness: 1,
    strokeColor: common_1.COLOR_PALETTE.black,
    roundness: null,
    strokeStyle: "solid",
    strokeWidth: 1,
    verticalAlign: common_1.VERTICAL_ALIGN.MIDDLE,
    locked: false,
};
