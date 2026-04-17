"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.findByToolName = exports.findAllByToolName = exports.getByToolName = exports.getAllByToolName = exports.queryByToolName = void 0;
const react_1 = require("@testing-library/react");
const common_1 = require("@excalidraw/common");
const _getAllByToolName = (container, tool) => {
    const toolTitle = tool === "lock" ? "lock" : common_1.TOOL_TYPE[tool];
    return react_1.queries.getAllByTestId(container, `toolbar-${toolTitle}`);
};
const getMultipleError = (_container, tool) => `Found multiple elements with tool name: ${tool}`;
const getMissingError = (_container, tool) => `Unable to find an element with tool name: ${tool}`;
_a = (0, react_1.buildQueries)(_getAllByToolName, getMultipleError, getMissingError), exports.queryByToolName = _a[0], exports.getAllByToolName = _a[1], exports.getByToolName = _a[2], exports.findAllByToolName = _a[3], exports.findByToolName = _a[4];
