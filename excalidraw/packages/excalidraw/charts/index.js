"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderSpreadsheet = exports.tryParseSpreadsheet = exports.tryParseNumber = exports.tryParseCells = exports.isSpreadsheetValidForChartType = void 0;
const charts_bar_1 = require("./charts.bar");
const charts_line_1 = require("./charts.line");
const charts_parse_1 = require("./charts.parse");
Object.defineProperty(exports, "tryParseCells", { enumerable: true, get: function () { return charts_parse_1.tryParseCells; } });
Object.defineProperty(exports, "tryParseNumber", { enumerable: true, get: function () { return charts_parse_1.tryParseNumber; } });
Object.defineProperty(exports, "tryParseSpreadsheet", { enumerable: true, get: function () { return charts_parse_1.tryParseSpreadsheet; } });
const charts_radar_1 = require("./charts.radar");
var charts_helpers_1 = require("./charts.helpers");
Object.defineProperty(exports, "isSpreadsheetValidForChartType", { enumerable: true, get: function () { return charts_helpers_1.isSpreadsheetValidForChartType; } });
const renderSpreadsheet = (chartType, spreadsheet, x, y, colorSeed) => {
    if (chartType === "line") {
        return (0, charts_line_1.renderLineChart)(spreadsheet, x, y, colorSeed);
    }
    if (chartType === "radar") {
        return (0, charts_radar_1.renderRadarChart)(spreadsheet, x, y, colorSeed);
    }
    return (0, charts_bar_1.renderBarChart)(spreadsheet, x, y, colorSeed);
};
exports.renderSpreadsheet = renderSpreadsheet;
