"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SearchMenu = exports.searchItemInFocusAtom = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const math_1 = require("@excalidraw/math");
const clsx_1 = __importDefault(require("clsx"));
const lodash_debounce_1 = __importDefault(require("lodash.debounce"));
const react_1 = require("react");
const common_1 = require("@excalidraw/common");
const element_1 = require("@excalidraw/element");
const element_2 = require("@excalidraw/element");
const common_2 = require("@excalidraw/common");
const element_3 = require("@excalidraw/element");
const element_4 = require("@excalidraw/element");
const frame_1 = require("@excalidraw/element/frame");
const editor_jotai_1 = require("../editor-jotai");
const useStable_1 = require("../hooks/useStable");
const i18n_1 = require("../i18n");
const App_1 = require("./App");
const Button_1 = require("./Button");
const TextField_1 = require("./TextField");
const icons_1 = require("./icons");
require("./SearchMenu.scss");
const searchQueryAtom = (0, editor_jotai_1.atom)("");
exports.searchItemInFocusAtom = (0, editor_jotai_1.atom)(null);
const SEARCH_DEBOUNCE = 350;
const SearchMenu = () => {
    const app = (0, App_1.useApp)();
    const setAppState = (0, App_1.useExcalidrawSetAppState)();
    const searchInputRef = (0, react_1.useRef)(null);
    const [inputValue, setInputValue] = (0, editor_jotai_1.useAtom)(searchQueryAtom);
    const searchQuery = inputValue.trim();
    const [isSearching, setIsSearching] = (0, react_1.useState)(false);
    const [searchMatches, setSearchMatches] = (0, react_1.useState)({
        nonce: null,
        items: [],
    });
    const searchedQueryRef = (0, react_1.useRef)(null);
    const lastSceneNonceRef = (0, react_1.useRef)(undefined);
    const [focusIndex, setFocusIndex] = (0, editor_jotai_1.useAtom)(exports.searchItemInFocusAtom);
    const elementsMap = app.scene.getNonDeletedElementsMap();
    (0, react_1.useEffect)(() => {
        if (isSearching) {
            return;
        }
        if (searchQuery !== searchedQueryRef.current ||
            app.scene.getSceneNonce() !== lastSceneNonceRef.current) {
            searchedQueryRef.current = null;
            handleSearch(searchQuery, app, (matchItems, index) => {
                setSearchMatches({
                    nonce: (0, common_2.randomInteger)(),
                    items: matchItems,
                });
                searchedQueryRef.current = searchQuery;
                lastSceneNonceRef.current = app.scene.getSceneNonce();
                setAppState({
                    searchMatches: matchItems.length
                        ? {
                            focusedId: null,
                            matches: matchItems.map((searchMatch) => ({
                                id: searchMatch.element.id,
                                focus: false,
                                matchedLines: searchMatch.matchedLines,
                            })),
                        }
                        : null,
                });
            });
        }
    }, [
        isSearching,
        searchQuery,
        elementsMap,
        app,
        setAppState,
        setFocusIndex,
        lastSceneNonceRef,
    ]);
    const goToNextItem = () => {
        if (searchMatches.items.length > 0) {
            setFocusIndex((focusIndex) => {
                if (focusIndex === null) {
                    return 0;
                }
                return (focusIndex + 1) % searchMatches.items.length;
            });
        }
    };
    const goToPreviousItem = () => {
        if (searchMatches.items.length > 0) {
            setFocusIndex((focusIndex) => {
                if (focusIndex === null) {
                    return 0;
                }
                return focusIndex - 1 < 0
                    ? searchMatches.items.length - 1
                    : focusIndex - 1;
            });
        }
    };
    (0, react_1.useEffect)(() => {
        setAppState((state) => {
            if (!state.searchMatches) {
                return null;
            }
            const focusedId = focusIndex !== null
                ? state.searchMatches?.matches[focusIndex]?.id || null
                : null;
            return {
                searchMatches: {
                    focusedId,
                    matches: state.searchMatches.matches.map((match, index) => {
                        if (index === focusIndex) {
                            return { ...match, focus: true };
                        }
                        return { ...match, focus: false };
                    }),
                },
            };
        });
    }, [focusIndex, setAppState]);
    (0, react_1.useEffect)(() => {
        if (searchMatches.items.length > 0 && focusIndex !== null) {
            const match = searchMatches.items[focusIndex];
            if (match) {
                const zoomValue = app.state.zoom.value;
                const matchAsElement = (0, element_3.newTextElement)({
                    text: match.searchQuery,
                    x: match.element.x + (match.matchedLines[0]?.offsetX ?? 0),
                    y: match.element.y + (match.matchedLines[0]?.offsetY ?? 0),
                    width: match.matchedLines[0]?.width,
                    height: match.matchedLines[0]?.height,
                    fontSize: (0, element_4.isFrameLikeElement)(match.element)
                        ? common_1.FRAME_STYLE.nameFontSize
                        : match.element.fontSize,
                    fontFamily: (0, element_4.isFrameLikeElement)(match.element)
                        ? common_1.FONT_FAMILY.Assistant
                        : match.element.fontFamily,
                });
                const FONT_SIZE_LEGIBILITY_THRESHOLD = 14;
                const fontSize = matchAsElement.fontSize;
                const isTextTiny = fontSize * zoomValue < FONT_SIZE_LEGIBILITY_THRESHOLD;
                if (!(0, element_1.isElementCompletelyInViewport)([matchAsElement], app.canvas.width / window.devicePixelRatio, app.canvas.height / window.devicePixelRatio, {
                    offsetLeft: app.state.offsetLeft,
                    offsetTop: app.state.offsetTop,
                    scrollX: app.state.scrollX,
                    scrollY: app.state.scrollY,
                    zoom: app.state.zoom,
                }, app.scene.getNonDeletedElementsMap(), app.getEditorUIOffsets()) ||
                    isTextTiny) {
                    let zoomOptions;
                    if (isTextTiny) {
                        if (fontSize >= FONT_SIZE_LEGIBILITY_THRESHOLD) {
                            zoomOptions = { fitToContent: true };
                        }
                        else {
                            zoomOptions = {
                                fitToViewport: true,
                                // calculate zoom level to make the fontSize ~equal to FONT_SIZE_THRESHOLD, rounded to nearest 10%
                                maxZoom: (0, math_1.round)(FONT_SIZE_LEGIBILITY_THRESHOLD / fontSize, 1),
                            };
                        }
                    }
                    else {
                        zoomOptions = { fitToContent: true };
                    }
                    app.scrollToContent(matchAsElement, {
                        animate: true,
                        duration: 300,
                        ...zoomOptions,
                        canvasOffsets: app.getEditorUIOffsets(),
                    });
                }
            }
        }
    }, [focusIndex, searchMatches, app]);
    (0, react_1.useEffect)(() => {
        return () => {
            setFocusIndex(null);
            searchedQueryRef.current = null;
            lastSceneNonceRef.current = undefined;
            setAppState({
                searchMatches: null,
            });
            setIsSearching(false);
        };
    }, [setAppState, setFocusIndex]);
    const stableState = (0, useStable_1.useStable)({
        goToNextItem,
        goToPreviousItem,
        searchMatches,
    });
    (0, react_1.useEffect)(() => {
        const eventHandler = (event) => {
            if (event.key === common_2.KEYS.ESCAPE &&
                !app.state.openDialog &&
                !app.state.openPopup) {
                event.preventDefault();
                event.stopPropagation();
                setAppState({
                    openSidebar: null,
                });
                return;
            }
            if (event[common_2.KEYS.CTRL_OR_CMD] && event.key === common_2.KEYS.F) {
                event.preventDefault();
                event.stopPropagation();
                if (app.state.openDialog) {
                    return;
                }
                if (!searchInputRef.current?.matches(":focus")) {
                    if (app.state.openDialog) {
                        setAppState({
                            openDialog: null,
                        });
                    }
                    searchInputRef.current?.focus();
                    searchInputRef.current?.select();
                }
            }
            if (event.target instanceof HTMLElement &&
                event.target.closest(".layer-ui__search")) {
                if (stableState.searchMatches.items.length) {
                    if (event.key === common_2.KEYS.ENTER) {
                        event.stopPropagation();
                        stableState.goToNextItem();
                    }
                    if (event.key === common_2.KEYS.ARROW_UP) {
                        event.stopPropagation();
                        stableState.goToPreviousItem();
                    }
                    else if (event.key === common_2.KEYS.ARROW_DOWN) {
                        event.stopPropagation();
                        stableState.goToNextItem();
                    }
                }
            }
        };
        // `capture` needed to prevent firing on initial open from App.tsx,
        // as well as to handle events before App ones
        return (0, common_2.addEventListener)(window, common_1.EVENT.KEYDOWN, eventHandler, {
            capture: true,
            passive: false,
        });
    }, [setAppState, stableState, app]);
    const matchCount = `${searchMatches.items.length} ${searchMatches.items.length === 1
        ? (0, i18n_1.t)("search.singleResult")
        : (0, i18n_1.t)("search.multipleResults")}`;
    return ((0, jsx_runtime_1.jsxs)("div", { className: "layer-ui__search", children: [(0, jsx_runtime_1.jsx)("div", { className: "layer-ui__search-header", children: (0, jsx_runtime_1.jsx)(TextField_1.TextField, { className: common_1.CLASSES.SEARCH_MENU_INPUT_WRAPPER, value: inputValue, ref: searchInputRef, placeholder: (0, i18n_1.t)("search.placeholder"), icon: icons_1.searchIcon, onChange: (value) => {
                        setInputValue(value);
                        setIsSearching(true);
                        const searchQuery = value.trim();
                        handleSearch(searchQuery, app, (matchItems, index) => {
                            setSearchMatches({
                                nonce: (0, common_2.randomInteger)(),
                                items: matchItems,
                            });
                            setFocusIndex(index);
                            searchedQueryRef.current = searchQuery;
                            lastSceneNonceRef.current = app.scene.getSceneNonce();
                            setAppState({
                                searchMatches: matchItems.length
                                    ? {
                                        focusedId: null,
                                        matches: matchItems.map((searchMatch) => ({
                                            id: searchMatch.element.id,
                                            focus: false,
                                            matchedLines: searchMatch.matchedLines,
                                        })),
                                    }
                                    : null,
                            });
                            setIsSearching(false);
                        });
                    }, selectOnRender: true }) }), (0, jsx_runtime_1.jsxs)("div", { className: "layer-ui__search-count", children: [searchMatches.items.length > 0 && ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [focusIndex !== null && focusIndex > -1 ? ((0, jsx_runtime_1.jsxs)("div", { children: [focusIndex + 1, " / ", matchCount] })) : ((0, jsx_runtime_1.jsx)("div", { children: matchCount })), (0, jsx_runtime_1.jsxs)("div", { className: "result-nav", children: [(0, jsx_runtime_1.jsx)(Button_1.Button, { onSelect: () => {
                                            goToNextItem();
                                        }, className: "result-nav-btn", children: icons_1.collapseDownIcon }), (0, jsx_runtime_1.jsx)(Button_1.Button, { onSelect: () => {
                                            goToPreviousItem();
                                        }, className: "result-nav-btn", children: icons_1.upIcon })] })] })), searchMatches.items.length === 0 &&
                        searchQuery &&
                        searchedQueryRef.current && ((0, jsx_runtime_1.jsx)("div", { style: { margin: "1rem auto" }, children: (0, i18n_1.t)("search.noMatch") }))] }), (0, jsx_runtime_1.jsx)(MatchList, { matches: searchMatches, onItemClick: setFocusIndex, focusIndex: focusIndex, searchQuery: searchQuery })] }));
};
exports.SearchMenu = SearchMenu;
const ListItem = (props) => {
    const preview = [
        props.preview.moreBefore ? "..." : "",
        props.preview.previewText.slice(0, props.preview.indexInSearchQuery),
        props.preview.previewText.slice(props.preview.indexInSearchQuery, props.preview.indexInSearchQuery + props.searchQuery.length),
        props.preview.previewText.slice(props.preview.indexInSearchQuery + props.searchQuery.length),
        props.preview.moreAfter ? "..." : "",
    ];
    return ((0, jsx_runtime_1.jsx)("div", { tabIndex: -1, className: (0, clsx_1.default)("layer-ui__result-item", {
            active: props.highlighted,
        }), onClick: props.onClick, ref: (ref) => {
            if (props.highlighted) {
                ref?.scrollIntoView({ behavior: "auto", block: "nearest" });
            }
        }, children: (0, jsx_runtime_1.jsx)("div", { className: "preview-text", children: preview.flatMap((text, idx) => ((0, jsx_runtime_1.jsx)(react_1.Fragment, { children: idx === 2 ? (0, jsx_runtime_1.jsx)("b", { children: text }) : text }, idx))) }) }));
};
const MatchListBase = (props) => {
    const frameNameMatches = (0, react_1.useMemo)(() => props.matches.items.filter((match) => (0, element_4.isFrameLikeElement)(match.element)), [props.matches]);
    const textMatches = (0, react_1.useMemo)(() => props.matches.items.filter((match) => (0, element_4.isTextElement)(match.element)), [props.matches]);
    return ((0, jsx_runtime_1.jsxs)("div", { children: [frameNameMatches.length > 0 && ((0, jsx_runtime_1.jsxs)("div", { className: "layer-ui__search-result-container", children: [(0, jsx_runtime_1.jsxs)("div", { className: "layer-ui__search-result-title", children: [(0, jsx_runtime_1.jsx)("div", { className: "title-icon", children: icons_1.frameToolIcon }), (0, jsx_runtime_1.jsx)("div", { children: (0, i18n_1.t)("search.frames") })] }), frameNameMatches.map((searchMatch, index) => ((0, jsx_runtime_1.jsx)(ListItem, { searchQuery: props.searchQuery, preview: searchMatch.preview, highlighted: index === props.focusIndex, onClick: () => props.onItemClick(index) }, searchMatch.element.id + searchMatch.index))), textMatches.length > 0 && (0, jsx_runtime_1.jsx)("div", { className: "layer-ui__divider" })] })), textMatches.length > 0 && ((0, jsx_runtime_1.jsxs)("div", { className: "layer-ui__search-result-container", children: [(0, jsx_runtime_1.jsxs)("div", { className: "layer-ui__search-result-title", children: [(0, jsx_runtime_1.jsx)("div", { className: "title-icon", children: icons_1.TextIcon }), (0, jsx_runtime_1.jsx)("div", { children: (0, i18n_1.t)("search.texts") })] }), textMatches.map((searchMatch, index) => ((0, jsx_runtime_1.jsx)(ListItem, { searchQuery: props.searchQuery, preview: searchMatch.preview, highlighted: index + frameNameMatches.length === props.focusIndex, onClick: () => props.onItemClick(index + frameNameMatches.length) }, searchMatch.element.id + searchMatch.index)))] }))] }));
};
const areEqual = (prevProps, nextProps) => {
    return (prevProps.matches.nonce === nextProps.matches.nonce &&
        prevProps.focusIndex === nextProps.focusIndex);
};
const MatchList = (0, react_1.memo)(MatchListBase, areEqual);
const getMatchPreview = (text, index, searchQuery) => {
    const WORDS_BEFORE = 2;
    const WORDS_AFTER = 5;
    const substrBeforeQuery = text.slice(0, index);
    const wordsBeforeQuery = substrBeforeQuery.split(/\s+/);
    // text = "small", query = "mall", not complete before
    // text = "small", query = "smal", complete before
    const isQueryCompleteBefore = substrBeforeQuery.endsWith(" ");
    const startWordIndex = wordsBeforeQuery.length -
        WORDS_BEFORE -
        1 -
        (isQueryCompleteBefore ? 0 : 1);
    let wordsBeforeAsString = wordsBeforeQuery.slice(startWordIndex <= 0 ? 0 : startWordIndex).join(" ") +
        (isQueryCompleteBefore ? " " : "");
    const MAX_ALLOWED_CHARS = 20;
    wordsBeforeAsString =
        wordsBeforeAsString.length > MAX_ALLOWED_CHARS
            ? wordsBeforeAsString.slice(-MAX_ALLOWED_CHARS)
            : wordsBeforeAsString;
    const substrAfterQuery = text.slice(index + searchQuery.length);
    const wordsAfter = substrAfterQuery.split(/\s+/);
    // text = "small", query = "mall", complete after
    // text = "small", query = "smal", not complete after
    const isQueryCompleteAfter = !substrAfterQuery.startsWith(" ");
    const numberOfWordsToTake = isQueryCompleteAfter
        ? WORDS_AFTER + 1
        : WORDS_AFTER;
    const wordsAfterAsString = (isQueryCompleteAfter ? "" : " ") +
        wordsAfter.slice(0, numberOfWordsToTake).join(" ");
    return {
        indexInSearchQuery: wordsBeforeAsString.length,
        previewText: wordsBeforeAsString + searchQuery + wordsAfterAsString,
        moreBefore: startWordIndex > 0,
        moreAfter: wordsAfter.length > numberOfWordsToTake,
    };
};
const normalizeWrappedText = (wrappedText, originalText) => {
    const wrappedLines = wrappedText.split("\n");
    const normalizedLines = [];
    let originalIndex = 0;
    for (let i = 0; i < wrappedLines.length; i++) {
        let currentLine = wrappedLines[i];
        const nextLine = wrappedLines[i + 1];
        if (nextLine) {
            const nextLineIndexInOriginal = originalText.indexOf(nextLine, originalIndex);
            if (nextLineIndexInOriginal > currentLine.length + originalIndex) {
                let j = nextLineIndexInOriginal - (currentLine.length + originalIndex);
                while (j > 0) {
                    currentLine += " ";
                    j--;
                }
            }
        }
        normalizedLines.push(currentLine);
        originalIndex = originalIndex + currentLine.length;
    }
    return normalizedLines.join("\n");
};
const getMatchedLines = (textElement, searchQuery, index) => {
    const normalizedText = normalizeWrappedText(textElement.text, textElement.originalText);
    const lines = normalizedText.split("\n");
    const lineIndexRanges = [];
    let currentIndex = 0;
    let lineNumber = 0;
    for (const line of lines) {
        const startIndex = currentIndex;
        const endIndex = startIndex + line.length - 1;
        lineIndexRanges.push({
            line,
            startIndex,
            endIndex,
            lineNumber,
        });
        // Move to the next line's start index
        currentIndex = endIndex + 1;
        lineNumber++;
    }
    let startIndex = index;
    let remainingQuery = textElement.originalText.slice(index, index + searchQuery.length);
    const matchedLines = [];
    for (const lineIndexRange of lineIndexRanges) {
        if (remainingQuery === "") {
            break;
        }
        if (startIndex >= lineIndexRange.startIndex &&
            startIndex <= lineIndexRange.endIndex) {
            const matchCapacity = lineIndexRange.endIndex + 1 - startIndex;
            const textToStart = lineIndexRange.line.slice(0, startIndex - lineIndexRange.startIndex);
            const matchedWord = remainingQuery.slice(0, matchCapacity);
            remainingQuery = remainingQuery.slice(matchCapacity);
            const offset = (0, element_2.measureText)(textToStart, (0, common_2.getFontString)(textElement), textElement.lineHeight);
            // measureText returns a non-zero width for the empty string
            // which is not what we're after here, hence the check and the correction
            if (textToStart === "") {
                offset.width = 0;
            }
            if (textElement.textAlign !== "left" && lineIndexRange.line.length > 0) {
                const lineLength = (0, element_2.measureText)(lineIndexRange.line, (0, common_2.getFontString)(textElement), textElement.lineHeight);
                const spaceToStart = textElement.textAlign === "center"
                    ? (textElement.width - lineLength.width) / 2
                    : textElement.width - lineLength.width;
                offset.width += spaceToStart;
            }
            const { width, height } = (0, element_2.measureText)(matchedWord, (0, common_2.getFontString)(textElement), textElement.lineHeight);
            const offsetX = offset.width;
            const offsetY = lineIndexRange.lineNumber * offset.height;
            matchedLines.push({
                offsetX,
                offsetY,
                width,
                height,
                showOnCanvas: true,
            });
            startIndex += matchCapacity;
        }
    }
    return matchedLines;
};
const getMatchInFrame = (frame, searchQuery, index, zoomValue) => {
    const text = frame.name ?? (0, frame_1.getDefaultFrameName)(frame);
    const matchedText = text.slice(index, index + searchQuery.length);
    const prefixText = text.slice(0, index);
    const font = (0, common_2.getFontString)({
        fontSize: common_1.FRAME_STYLE.nameFontSize,
        fontFamily: common_1.FONT_FAMILY.Assistant,
    });
    const lineHeight = (0, common_1.getLineHeight)(common_1.FONT_FAMILY.Assistant);
    const offset = (0, element_2.measureText)(prefixText, font, lineHeight);
    // Correct non-zero width for empty string
    if (prefixText === "") {
        offset.width = 0;
    }
    const matchedMetrics = (0, element_2.measureText)(matchedText, font, lineHeight);
    const offsetX = offset.width;
    const offsetY = -offset.height - common_1.FRAME_STYLE.strokeWidth;
    const width = matchedMetrics.width;
    return [
        {
            offsetX,
            offsetY,
            width,
            height: matchedMetrics.height,
            showOnCanvas: offsetX + width <= frame.width * zoomValue,
        },
    ];
};
const escapeSpecialCharacters = (string) => {
    return string.replace(/[.*+?^${}()|[\]\\-]/g, "\\$&");
};
const handleSearch = (0, lodash_debounce_1.default)((searchQuery, app, cb) => {
    if (!searchQuery || searchQuery === "") {
        cb([], null);
        return;
    }
    const elements = app.scene.getNonDeletedElements();
    const texts = elements.filter((el) => (0, element_4.isTextElement)(el));
    const frames = elements.filter((el) => (0, element_4.isFrameLikeElement)(el));
    texts.sort((a, b) => a.y - b.y);
    frames.sort((a, b) => a.y - b.y);
    const textMatches = [];
    const regex = new RegExp(escapeSpecialCharacters(searchQuery), "gi");
    for (const textEl of texts) {
        let match = null;
        const text = textEl.originalText;
        while ((match = regex.exec(text)) !== null) {
            const preview = getMatchPreview(text, match.index, searchQuery);
            const matchedLines = getMatchedLines(textEl, searchQuery, match.index);
            if (matchedLines.length > 0) {
                textMatches.push({
                    element: textEl,
                    searchQuery,
                    preview,
                    index: match.index,
                    matchedLines,
                });
            }
        }
    }
    const frameMatches = [];
    for (const frame of frames) {
        let match = null;
        const name = frame.name ?? (0, frame_1.getDefaultFrameName)(frame);
        while ((match = regex.exec(name)) !== null) {
            const preview = getMatchPreview(name, match.index, searchQuery);
            const matchedLines = getMatchInFrame(frame, searchQuery, match.index, app.state.zoom.value);
            if (matchedLines.length > 0) {
                frameMatches.push({
                    element: frame,
                    searchQuery,
                    preview,
                    index: match.index,
                    matchedLines,
                });
            }
        }
    }
    const visibleIds = new Set(app.visibleElements.map((visibleElement) => visibleElement.id));
    // putting frame matches first
    const matchItems = [...frameMatches, ...textMatches];
    const focusIndex = matchItems.findIndex((matchItem) => visibleIds.has(matchItem.element.id)) ?? null;
    cb(matchItems, focusIndex);
}, SEARCH_DEBOUNCE);
