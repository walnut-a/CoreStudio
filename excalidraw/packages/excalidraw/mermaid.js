"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isMaybeMermaidDefinition = void 0;
/** heuristically checks whether the text may be a mermaid diagram definition */
const isMaybeMermaidDefinition = (text) => {
    const chartTypes = [
        "flowchart",
        "graph",
        "sequenceDiagram",
        "classDiagram",
        "stateDiagram",
        "stateDiagram-v2",
        "erDiagram",
        "journey",
        "gantt",
        "pie",
        "quadrantChart",
        "requirementDiagram",
        "gitGraph",
        "C4Context",
        "mindmap",
        "timeline",
        "zenuml",
        "sankey",
        "xychart",
        "block",
    ];
    const re = new RegExp(`^(?:%%{.*?}%%[\\s\\n]*)?\\b(?:${chartTypes
        .map((x) => `\\s*${x}(-beta)?`)
        .join("|")})\\b`);
    return re.test(text.trim());
};
exports.isMaybeMermaidDefinition = isMaybeMermaidDefinition;
