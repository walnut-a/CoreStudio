"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SVGLayer = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
require("./SVGLayer.scss");
const SVGLayer = ({ trails }) => {
    const svgRef = (0, react_1.useRef)(null);
    (0, react_1.useEffect)(() => {
        if (svgRef.current) {
            for (const trail of trails) {
                trail.start(svgRef.current);
            }
        }
        return () => {
            for (const trail of trails) {
                trail.stop();
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, trails);
    return ((0, jsx_runtime_1.jsx)("div", { className: "SVGLayer", children: (0, jsx_runtime_1.jsx)("svg", { ref: svgRef }) }));
};
exports.SVGLayer = SVGLayer;
