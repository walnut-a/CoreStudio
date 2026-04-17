"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatMermaidParseErrorMessage = exports.getMermaidSyntaxErrorGuidance = exports.getMermaidErrorLineNumber = exports.getMermaidInactiveParticipant = exports.isMermaidCaretLine = exports.isMermaidAutoFixableError = exports.isMermaidParseSyntaxError = void 0;
const MERMAID_SYNTAX_ERROR_LINE = /(?:Parse|Lexical) error on line (\d+)[.:]/i;
const MERMAID_INACTIVE_PARTICIPANT_ERROR = /Trying to inactivate an inactive participant \((.+)\)/i;
const MERMAID_CARET_LINE = /^\s*-+\^\s*$/;
const isMermaidParseSyntaxError = (message) => MERMAID_SYNTAX_ERROR_LINE.test(message);
exports.isMermaidParseSyntaxError = isMermaidParseSyntaxError;
const isMermaidAutoFixableError = (message) => (0, exports.isMermaidParseSyntaxError)(message) ||
    MERMAID_INACTIVE_PARTICIPANT_ERROR.test(message);
exports.isMermaidAutoFixableError = isMermaidAutoFixableError;
const isMermaidCaretLine = (line) => MERMAID_CARET_LINE.test(line);
exports.isMermaidCaretLine = isMermaidCaretLine;
const getMermaidInactiveParticipant = (message) => {
    const match = message.match(MERMAID_INACTIVE_PARTICIPANT_ERROR);
    if (!match?.[1]) {
        return null;
    }
    return match[1].trim();
};
exports.getMermaidInactiveParticipant = getMermaidInactiveParticipant;
const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const getInactiveParticipantLineNumber = (message, sourceText) => {
    const participant = (0, exports.getMermaidInactiveParticipant)(message);
    if (!participant) {
        return null;
    }
    const deactivatePattern = new RegExp(`^\\s*deactivate\\s+${escapeRegExp(participant)}(?:\\s+%%.*)?\\s*$`);
    const lines = sourceText.split(/\r?\n/);
    for (let index = lines.length - 1; index >= 0; index--) {
        if (deactivatePattern.test(lines[index])) {
            return index + 1;
        }
    }
    return null;
};
const getMermaidErrorLineNumber = (message, sourceText) => {
    const match = message.match(MERMAID_SYNTAX_ERROR_LINE);
    if (!match) {
        if (!sourceText) {
            return null;
        }
        return getInactiveParticipantLineNumber(message, sourceText);
    }
    return Number.parseInt(match[1], 10);
};
exports.getMermaidErrorLineNumber = getMermaidErrorLineNumber;
const countMatches = (text, re) => (text.match(re) || []).length;
const getMermaidSyntaxErrorGuidance = (message, sourceText) => {
    if (!(0, exports.isMermaidParseSyntaxError)(message)) {
        return null;
    }
    const errorLine = (0, exports.getMermaidErrorLineNumber)(message, sourceText);
    const summary = errorLine
        ? `Syntax error near line ${errorLine}.`
        : "Syntax error in Mermaid diagram.";
    const likelyCauses = [];
    if (sourceText) {
        const openBrackets = countMatches(sourceText, /\[/g);
        const closeBrackets = countMatches(sourceText, /\]/g);
        if (openBrackets !== closeBrackets) {
            likelyCauses.push("Unbalanced square brackets in a node label.");
        }
        const openParens = countMatches(sourceText, /\(/g);
        const closeParens = countMatches(sourceText, /\)/g);
        if (openParens !== closeParens) {
            likelyCauses.push("Unbalanced parentheses in a node shape.");
        }
        const openBraces = countMatches(sourceText, /\{/g);
        const closeBraces = countMatches(sourceText, /\}/g);
        if (openBraces !== closeBraces) {
            likelyCauses.push("Unbalanced braces in a decision node.");
        }
        const subgraphCount = countMatches(sourceText, /^\s*subgraph\b/gm);
        const endCount = countMatches(sourceText, /^\s*end\s*$/gm);
        if (subgraphCount > endCount) {
            likelyCauses.push("A block is missing an `end` statement.");
        }
    }
    if (/got 'NODE_STRING'/.test(message) || /got 'PS'/.test(message)) {
        likelyCauses.push("An extra character/token may appear after a node or label definition.");
    }
    if (likelyCauses.length === 0) {
        likelyCauses.push("A node or edge line is malformed (missing/extra delimiters).");
        likelyCauses.push("A block (`subgraph`, `class`, etc.) may be incomplete.");
    }
    return {
        summary,
        likelyCauses: [...new Set(likelyCauses)],
    };
};
exports.getMermaidSyntaxErrorGuidance = getMermaidSyntaxErrorGuidance;
const formatMermaidParseErrorMessage = (message) => {
    if (!(0, exports.isMermaidParseSyntaxError)(message)) {
        return message;
    }
    return message.replace(/\n\s*Expecting[\s\S]*$/, "").trimEnd();
};
exports.formatMermaidParseErrorMessage = formatMermaidParseErrorMessage;
