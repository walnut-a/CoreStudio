"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMermaidAutoFixCandidates = void 0;
const mermaidError_1 = require("./mermaidError");
const getErrorLineIndex = (message, sourceText) => {
    const lineNumber = (0, mermaidError_1.getMermaidErrorLineNumber)(message, sourceText);
    if (lineNumber == null) {
        return null;
    }
    return lineNumber - 1;
};
const replaceLineAt = (lines, index, transform) => {
    if (index < 0 || index >= lines.length) {
        return null;
    }
    const nextLine = transform(lines[index]);
    if (nextLine === lines[index]) {
        return null;
    }
    const nextLines = [...lines];
    nextLines[index] = nextLine;
    return nextLines.join("\n");
};
const stripTrailingTokenAfterShape = (line) => {
    const alphaTailMatch = line.match(/^(.*(?:\[[^\]]*]|\([^)]*\)|\{[^}]*}|"(?:[^"]*)"|'(?:[^']*)'))([A-Za-z]+)\s*$/);
    if (alphaTailMatch) {
        return alphaTailMatch[1];
    }
    const punctuationTailMatch = line.match(/^(.*(?:\[[^\]]*]|\([^)]*\)|\{[^}]*}|"(?:[^"]*)"|'(?:[^']*)'))([,;:])\s*$/);
    if (punctuationTailMatch) {
        return punctuationTailMatch[1];
    }
    return line;
};
const removeExtraArrowheadAfterEdgeLabel = (line) => {
    // Common typo in generated Mermaid: `-->|label|> Target` (extra `>`).
    // Convert it to `-->|label| Target`.
    return line.replace(/(\|[^|\n]+\|)\s*>\s*(?=[A-Za-z0-9_("[{'`])/g, "$1 ");
};
const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const removeLastDeactivateForParticipant = (sourceText, participant) => {
    const pattern = new RegExp(`^\\s*deactivate\\s+${escapeRegExp(participant)}(?:\\s+%%.*)?\\s*$`);
    const lines = sourceText.split(/\r?\n/);
    for (let index = lines.length - 1; index >= 0; index--) {
        if (pattern.test(lines[index])) {
            return lines.filter((_, lineIndex) => lineIndex !== index).join("\n");
        }
    }
    return null;
};
const removeAllDeactivateForParticipant = (sourceText, participant) => {
    const pattern = new RegExp(`^\\s*deactivate\\s+${escapeRegExp(participant)}(?:\\s+%%.*)?\\s*$`);
    const lines = sourceText.split(/\r?\n/);
    let removedAny = false;
    const remainingLines = lines.filter((line) => {
        if (!pattern.test(line)) {
            return true;
        }
        removedAny = true;
        return false;
    });
    return removedAny ? remainingLines.join("\n") : null;
};
const appendMissingEnds = (sourceText) => {
    const subgraphCount = (sourceText.match(/^\s*subgraph\b/gm) || []).length;
    const endCount = (sourceText.match(/^\s*end\s*$/gm) || []).length;
    const missingCount = subgraphCount - endCount;
    if (missingCount <= 0) {
        return null;
    }
    const endings = Array.from({ length: missingCount }, () => "end").join("\n");
    return `${sourceText.trimEnd()}\n${endings}`;
};
const normalizeSmartQuotes = (sourceText) => sourceText.replace(/[“”]/g, '"').replace(/[‘’]/g, "'");
const getMermaidAutoFixCandidates = (sourceText, errorMessage) => {
    if (!(0, mermaidError_1.isMermaidAutoFixableError)(errorMessage) || !sourceText.trim()) {
        return [];
    }
    const candidates = [];
    const seen = new Set();
    const addCandidate = (candidate) => {
        if (!candidate || candidate === sourceText || seen.has(candidate)) {
            return;
        }
        seen.add(candidate);
        candidates.push(candidate);
    };
    const inactiveParticipant = (0, mermaidError_1.getMermaidInactiveParticipant)(errorMessage);
    if (inactiveParticipant) {
        addCandidate(removeLastDeactivateForParticipant(sourceText, inactiveParticipant));
        // Fallback for repeated invalid inactivations in one diagram.
        addCandidate(removeAllDeactivateForParticipant(sourceText, inactiveParticipant));
    }
    if ((0, mermaidError_1.isMermaidParseSyntaxError)(errorMessage)) {
        const lines = sourceText.split(/\r?\n/);
        const errorLineIndex = getErrorLineIndex(errorMessage, sourceText);
        const lineIndexesToTry = errorLineIndex == null
            ? []
            : [errorLineIndex, errorLineIndex - 1, errorLineIndex + 1];
        for (const lineIndex of lineIndexesToTry) {
            addCandidate(replaceLineAt(lines, lineIndex, (line) => stripTrailingTokenAfterShape(line)));
            addCandidate(replaceLineAt(lines, lineIndex, (line) => removeExtraArrowheadAfterEdgeLabel(line)));
        }
        // Also try full-text replacement so repeated occurrences on other lines
        // are fixed together in a single candidate.
        addCandidate(removeExtraArrowheadAfterEdgeLabel(sourceText));
        addCandidate(appendMissingEnds(sourceText));
        const normalizedQuotes = normalizeSmartQuotes(sourceText);
        addCandidate(normalizedQuotes === sourceText ? null : normalizedQuotes);
    }
    return candidates;
};
exports.getMermaidAutoFixCandidates = getMermaidAutoFixCandidates;
