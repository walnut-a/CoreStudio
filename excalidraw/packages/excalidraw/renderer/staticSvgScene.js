"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderSceneToSvg = void 0;
const common_1 = require("@excalidraw/common");
const common_2 = require("@excalidraw/common");
const element_1 = require("@excalidraw/element");
const element_2 = require("@excalidraw/element");
const element_3 = require("@excalidraw/element");
const element_4 = require("@excalidraw/element");
const element_5 = require("@excalidraw/element");
const element_6 = require("@excalidraw/element");
const element_7 = require("@excalidraw/element");
const element_8 = require("@excalidraw/element");
const element_9 = require("@excalidraw/element");
const element_10 = require("@excalidraw/element");
const element_11 = require("@excalidraw/element");
const roughSVGDrawWithPrecision = (rsvg, drawable, precision) => {
    if (typeof precision === "undefined") {
        return rsvg.draw(drawable);
    }
    const pshape = {
        sets: drawable.sets,
        shape: drawable.shape,
        options: { ...drawable.options, fixedDecimalPlaceDigits: precision },
    };
    return rsvg.draw(pshape);
};
const maybeWrapNodesInFrameClipPath = (element, root, nodes, frameRendering, elementsMap) => {
    if (!frameRendering.enabled || !frameRendering.clip) {
        return null;
    }
    const frame = (0, element_8.getContainingFrame)(element, elementsMap);
    if (frame) {
        const g = root.ownerDocument.createElementNS(common_1.SVG_NS, "g");
        g.setAttributeNS(common_1.SVG_NS, "clip-path", `url(#${frame.id})`);
        nodes.forEach((node) => g.appendChild(node));
        return g;
    }
    return null;
};
const renderElementToSvg = (element, elementsMap, rsvg, svgRoot, files, offsetX, offsetY, renderConfig) => {
    const offset = { x: offsetX, y: offsetY };
    const [x1, y1, x2, y2] = (0, element_11.getElementAbsoluteCoords)(element, elementsMap);
    let cx = (x2 - x1) / 2 - (element.x - x1);
    let cy = (y2 - y1) / 2 - (element.y - y1);
    if ((0, element_7.isTextElement)(element)) {
        const container = (0, element_5.getContainerElement)(element, elementsMap);
        if ((0, element_7.isArrowElement)(container)) {
            const [x1, y1, x2, y2] = (0, element_11.getElementAbsoluteCoords)(container, elementsMap);
            const boundTextCoords = element_4.LinearElementEditor.getBoundTextElementPosition(container, element, elementsMap);
            cx = (x2 - x1) / 2 - (boundTextCoords.x - x1);
            cy = (y2 - y1) / 2 - (boundTextCoords.y - y1);
            offsetX = offsetX + boundTextCoords.x - element.x;
            offsetY = offsetY + boundTextCoords.y - element.y;
        }
    }
    const degree = (180 * element.angle) / Math.PI;
    // element to append node to, most of the time svgRoot
    let root = svgRoot;
    // if the element has a link, create an anchor tag and make that the new root
    if (element.link) {
        const anchorTag = svgRoot.ownerDocument.createElementNS(common_1.SVG_NS, "a");
        anchorTag.setAttribute("href", (0, common_2.normalizeLink)(element.link));
        root.appendChild(anchorTag);
        root = anchorTag;
    }
    const addToRoot = (node, element) => {
        if ((0, common_1.isTestEnv)()) {
            node.setAttribute("data-id", element.id);
        }
        root.appendChild(node);
    };
    const opacity = (((0, element_8.getContainingFrame)(element, elementsMap)?.opacity ?? 100) *
        element.opacity) /
        10000;
    switch (element.type) {
        case "selection": {
            // Since this is used only during editing experience, which is canvas based,
            // this should not happen
            throw new Error("Selection rendering is not supported for SVG");
        }
        case "rectangle":
        case "diamond":
        case "ellipse": {
            const shape = element_10.ShapeCache.generateElementShape(element, renderConfig);
            const node = roughSVGDrawWithPrecision(rsvg, shape, common_1.MAX_DECIMALS_FOR_SVG_EXPORT);
            if (opacity !== 1) {
                node.setAttribute("stroke-opacity", `${opacity}`);
                node.setAttribute("fill-opacity", `${opacity}`);
            }
            node.setAttribute("stroke-linecap", "round");
            node.setAttribute("transform", `translate(${offsetX || 0} ${offsetY || 0}) rotate(${degree} ${cx} ${cy})`);
            const g = maybeWrapNodesInFrameClipPath(element, root, [node], renderConfig.frameRendering, elementsMap);
            addToRoot(g || node, element);
            break;
        }
        case "iframe":
        case "embeddable": {
            // render placeholder rectangle
            const shape = element_10.ShapeCache.generateElementShape(element, renderConfig);
            const node = roughSVGDrawWithPrecision(rsvg, shape, common_1.MAX_DECIMALS_FOR_SVG_EXPORT);
            const opacity = element.opacity / 100;
            if (opacity !== 1) {
                node.setAttribute("stroke-opacity", `${opacity}`);
                node.setAttribute("fill-opacity", `${opacity}`);
            }
            node.setAttribute("stroke-linecap", "round");
            node.setAttribute("transform", `translate(${offsetX || 0} ${offsetY || 0}) rotate(${degree} ${cx} ${cy})`);
            addToRoot(node, element);
            const label = (0, element_3.createPlaceholderEmbeddableLabel)(element);
            renderElementToSvg(label, elementsMap, rsvg, root, files, label.x + offset.x - element.x, label.y + offset.y - element.y, renderConfig);
            // render embeddable element + iframe
            const embeddableNode = roughSVGDrawWithPrecision(rsvg, shape, common_1.MAX_DECIMALS_FOR_SVG_EXPORT);
            embeddableNode.setAttribute("stroke-linecap", "round");
            embeddableNode.setAttribute("transform", `translate(${offsetX || 0} ${offsetY || 0}) rotate(${degree} ${cx} ${cy})`);
            while (embeddableNode.firstChild) {
                embeddableNode.removeChild(embeddableNode.firstChild);
            }
            const radius = (0, element_9.getCornerRadius)(Math.min(element.width, element.height), element);
            const embedLink = (0, element_3.getEmbedLink)((0, common_2.toValidURL)(element.link || ""));
            // if rendering embeddables explicitly disabled or
            // embedding documents via srcdoc (which doesn't seem to work for SVGs)
            // replace with a link instead
            if (renderConfig.renderEmbeddables === false ||
                embedLink?.type === "document") {
                const anchorTag = svgRoot.ownerDocument.createElementNS(common_1.SVG_NS, "a");
                anchorTag.setAttribute("href", (0, common_2.normalizeLink)(element.link || ""));
                anchorTag.setAttribute("target", "_blank");
                anchorTag.setAttribute("rel", "noopener noreferrer");
                anchorTag.style.borderRadius = `${radius}px`;
                embeddableNode.appendChild(anchorTag);
            }
            else {
                const foreignObject = svgRoot.ownerDocument.createElementNS(common_1.SVG_NS, "foreignObject");
                foreignObject.style.width = `${element.width}px`;
                foreignObject.style.height = `${element.height}px`;
                foreignObject.style.border = "none";
                const div = foreignObject.ownerDocument.createElementNS(common_1.SVG_NS, "div");
                div.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
                div.style.width = "100%";
                div.style.height = "100%";
                const iframe = div.ownerDocument.createElement("iframe");
                iframe.src = embedLink?.link ?? "";
                iframe.style.width = "100%";
                iframe.style.height = "100%";
                iframe.style.border = "none";
                iframe.style.borderRadius = `${radius}px`;
                iframe.style.top = "0";
                iframe.style.left = "0";
                iframe.allowFullscreen = true;
                div.appendChild(iframe);
                foreignObject.appendChild(div);
                embeddableNode.appendChild(foreignObject);
            }
            addToRoot(embeddableNode, element);
            break;
        }
        case "line":
        case "arrow": {
            const boundText = (0, element_5.getBoundTextElement)(element, elementsMap);
            const maskPath = svgRoot.ownerDocument.createElementNS(common_1.SVG_NS, "mask");
            if (boundText) {
                maskPath.setAttribute("id", `mask-${element.id}`);
                const maskRectVisible = svgRoot.ownerDocument.createElementNS(common_1.SVG_NS, "rect");
                offsetX = offsetX || 0;
                offsetY = offsetY || 0;
                maskRectVisible.setAttribute("x", "0");
                maskRectVisible.setAttribute("y", "0");
                maskRectVisible.setAttribute("fill", "#fff");
                maskRectVisible.setAttribute("width", `${element.width + 100 + offsetX}`);
                maskRectVisible.setAttribute("height", `${element.height + 100 + offsetY}`);
                maskPath.appendChild(maskRectVisible);
                const maskRectInvisible = svgRoot.ownerDocument.createElementNS(common_1.SVG_NS, "rect");
                const boundTextCoords = element_4.LinearElementEditor.getBoundTextElementPosition(element, boundText, elementsMap);
                const maskX = offsetX + boundTextCoords.x - element.x;
                const maskY = offsetY + boundTextCoords.y - element.y;
                maskRectInvisible.setAttribute("x", maskX.toString());
                maskRectInvisible.setAttribute("y", maskY.toString());
                maskRectInvisible.setAttribute("fill", "#000");
                maskRectInvisible.setAttribute("width", `${boundText.width}`);
                maskRectInvisible.setAttribute("height", `${boundText.height}`);
                maskRectInvisible.setAttribute("opacity", "1");
                maskPath.appendChild(maskRectInvisible);
            }
            const group = svgRoot.ownerDocument.createElementNS(common_1.SVG_NS, "g");
            if (boundText) {
                group.setAttribute("mask", `url(#mask-${element.id})`);
            }
            group.setAttribute("stroke-linecap", "round");
            const shapes = element_10.ShapeCache.generateElementShape(element, renderConfig);
            shapes.forEach((shape) => {
                const node = roughSVGDrawWithPrecision(rsvg, shape, common_1.MAX_DECIMALS_FOR_SVG_EXPORT);
                if (opacity !== 1) {
                    node.setAttribute("stroke-opacity", `${opacity}`);
                    node.setAttribute("fill-opacity", `${opacity}`);
                }
                node.setAttribute("transform", `translate(${offsetX || 0} ${offsetY || 0}) rotate(${degree} ${cx} ${cy})`);
                if (element.type === "line" &&
                    (0, element_9.isPathALoop)(element.points) &&
                    element.backgroundColor !== "transparent") {
                    node.setAttribute("fill-rule", "evenodd");
                }
                group.appendChild(node);
            });
            const g = maybeWrapNodesInFrameClipPath(element, root, [group, maskPath], renderConfig.frameRendering, elementsMap);
            if (g) {
                addToRoot(g, element);
                root.appendChild(g);
            }
            else {
                addToRoot(group, element);
                root.append(maskPath);
            }
            break;
        }
        case "freedraw": {
            const wrapper = svgRoot.ownerDocument.createElementNS(common_1.SVG_NS, "g");
            const shapes = element_10.ShapeCache.generateElementShape(element, renderConfig);
            // always ordered as [background, stroke]
            for (const shape of shapes) {
                if (typeof shape === "string") {
                    // stroke (SVGPathString)
                    const path = svgRoot.ownerDocument.createElementNS(common_1.SVG_NS, "path");
                    path.setAttribute("fill", renderConfig.theme === common_1.THEME.DARK
                        ? (0, common_1.applyDarkModeFilter)(element.strokeColor)
                        : element.strokeColor);
                    path.setAttribute("d", shape);
                    wrapper.appendChild(path);
                }
                else {
                    // background (Drawable)
                    const bgNode = roughSVGDrawWithPrecision(rsvg, shape, common_1.MAX_DECIMALS_FOR_SVG_EXPORT);
                    // if children wrapped in <g>, unwrap it
                    if (bgNode.nodeName === "g") {
                        while (bgNode.firstChild) {
                            wrapper.appendChild(bgNode.firstChild);
                        }
                    }
                    else {
                        wrapper.appendChild(bgNode);
                    }
                }
            }
            if (opacity !== 1) {
                wrapper.setAttribute("stroke-opacity", `${opacity}`);
                wrapper.setAttribute("fill-opacity", `${opacity}`);
            }
            wrapper.setAttribute("transform", `translate(${offsetX || 0} ${offsetY || 0}) rotate(${degree} ${cx} ${cy})`);
            wrapper.setAttribute("stroke", "none");
            const g = maybeWrapNodesInFrameClipPath(element, root, [wrapper], renderConfig.frameRendering, elementsMap);
            addToRoot(g || wrapper, element);
            break;
        }
        case "image": {
            const width = Math.round(element.width);
            const height = Math.round(element.height);
            const fileData = (0, element_7.isInitializedImageElement)(element) && files[element.fileId];
            if (fileData) {
                const { reuseImages = true } = renderConfig;
                let symbolId = `image-${fileData.id}`;
                let uncroppedWidth = element.width;
                let uncroppedHeight = element.height;
                if (element.crop) {
                    ({ width: uncroppedWidth, height: uncroppedHeight } =
                        (0, element_2.getUncroppedWidthAndHeight)(element));
                    symbolId = `image-crop-${fileData.id}-${(0, element_1.hashString)(`${uncroppedWidth}x${uncroppedHeight}`)}`;
                }
                if (!reuseImages) {
                    symbolId = `image-${element.id}`;
                }
                let symbol = svgRoot.querySelector(`#${symbolId}`);
                if (!symbol) {
                    symbol = svgRoot.ownerDocument.createElementNS(common_1.SVG_NS, "symbol");
                    symbol.id = symbolId;
                    const image = svgRoot.ownerDocument.createElementNS(common_1.SVG_NS, "image");
                    image.setAttribute("href", fileData.dataURL);
                    image.setAttribute("preserveAspectRatio", "none");
                    if (element.crop || !reuseImages) {
                        image.setAttribute("width", `${uncroppedWidth}`);
                        image.setAttribute("height", `${uncroppedHeight}`);
                    }
                    else {
                        image.setAttribute("width", "100%");
                        image.setAttribute("height", "100%");
                    }
                    symbol.appendChild(image);
                    (root.querySelector("defs") || root).prepend(symbol);
                }
                const use = svgRoot.ownerDocument.createElementNS(common_1.SVG_NS, "use");
                use.setAttribute("href", `#${symbolId}`);
                let normalizedCropX = 0;
                let normalizedCropY = 0;
                if (element.crop) {
                    const { width: uncroppedWidth, height: uncroppedHeight } = (0, element_2.getUncroppedWidthAndHeight)(element);
                    normalizedCropX =
                        element.crop.x / (element.crop.naturalWidth / uncroppedWidth);
                    normalizedCropY =
                        element.crop.y / (element.crop.naturalHeight / uncroppedHeight);
                }
                const adjustedCenterX = cx + normalizedCropX;
                const adjustedCenterY = cy + normalizedCropY;
                use.setAttribute("width", `${width + normalizedCropX}`);
                use.setAttribute("height", `${height + normalizedCropY}`);
                use.setAttribute("opacity", `${opacity}`);
                // We first apply `scale` transforms (horizontal/vertical mirroring)
                // on the <use> element, then apply translation and rotation
                // on the <g> element which wraps the <use>.
                // Doing this separately is a quick hack to to work around compositing
                // the transformations correctly (the transform-origin was not being
                // applied correctly).
                if (element.scale[0] !== 1 || element.scale[1] !== 1) {
                    use.setAttribute("transform", `translate(${adjustedCenterX} ${adjustedCenterY}) scale(${element.scale[0]} ${element.scale[1]}) translate(${-adjustedCenterX} ${-adjustedCenterY})`);
                }
                const g = svgRoot.ownerDocument.createElementNS(common_1.SVG_NS, "g");
                if (renderConfig.theme === common_1.THEME.DARK &&
                    fileData.mimeType === common_1.MIME_TYPES.svg) {
                    g.setAttribute("filter", common_1.DARK_THEME_FILTER);
                }
                if (element.crop) {
                    const mask = svgRoot.ownerDocument.createElementNS(common_1.SVG_NS, "mask");
                    mask.setAttribute("id", `mask-image-crop-${element.id}`);
                    mask.setAttribute("fill", "#fff");
                    const maskRect = svgRoot.ownerDocument.createElementNS(common_1.SVG_NS, "rect");
                    maskRect.setAttribute("x", `${normalizedCropX}`);
                    maskRect.setAttribute("y", `${normalizedCropY}`);
                    maskRect.setAttribute("width", `${width}`);
                    maskRect.setAttribute("height", `${height}`);
                    mask.appendChild(maskRect);
                    root.appendChild(mask);
                    g.setAttribute("mask", `url(#${mask.id})`);
                }
                g.appendChild(use);
                g.setAttribute("transform", `translate(${offsetX - normalizedCropX} ${offsetY - normalizedCropY}) rotate(${degree} ${adjustedCenterX} ${adjustedCenterY})`);
                if (element.roundness) {
                    const clipPath = svgRoot.ownerDocument.createElementNS(common_1.SVG_NS, "clipPath");
                    clipPath.id = `image-clipPath-${element.id}`;
                    clipPath.setAttribute("clipPathUnits", "userSpaceOnUse");
                    const clipRect = svgRoot.ownerDocument.createElementNS(common_1.SVG_NS, "rect");
                    const radius = (0, element_9.getCornerRadius)(Math.min(element.width, element.height), element);
                    const clipOffsetX = element.crop ? normalizedCropX : 0;
                    const clipOffsetY = element.crop ? normalizedCropY : 0;
                    clipRect.setAttribute("x", `${clipOffsetX}`);
                    clipRect.setAttribute("y", `${clipOffsetY}`);
                    clipRect.setAttribute("width", `${element.width}`);
                    clipRect.setAttribute("height", `${element.height}`);
                    clipRect.setAttribute("rx", `${radius}`);
                    clipRect.setAttribute("ry", `${radius}`);
                    clipPath.appendChild(clipRect);
                    addToRoot(clipPath, element);
                    g.setAttributeNS(common_1.SVG_NS, "clip-path", `url(#${clipPath.id})`);
                }
                const clipG = maybeWrapNodesInFrameClipPath(element, root, [g], renderConfig.frameRendering, elementsMap);
                addToRoot(clipG || g, element);
            }
            break;
        }
        // frames are not rendered and only acts as a container
        case "frame":
        case "magicframe": {
            if (renderConfig.frameRendering.enabled &&
                renderConfig.frameRendering.outline) {
                const rect = document.createElementNS(common_1.SVG_NS, "rect");
                rect.setAttribute("transform", `translate(${offsetX || 0} ${offsetY || 0}) rotate(${degree} ${cx} ${cy})`);
                rect.setAttribute("width", `${element.width}px`);
                rect.setAttribute("height", `${element.height}px`);
                // Rounded corners
                rect.setAttribute("rx", common_1.FRAME_STYLE.radius.toString());
                rect.setAttribute("ry", common_1.FRAME_STYLE.radius.toString());
                rect.setAttribute("fill", "none");
                rect.setAttribute("stroke", renderConfig.theme === common_1.THEME.DARK
                    ? (0, common_1.applyDarkModeFilter)(common_1.FRAME_STYLE.strokeColor)
                    : common_1.FRAME_STYLE.strokeColor);
                rect.setAttribute("stroke-width", common_1.FRAME_STYLE.strokeWidth.toString());
                addToRoot(rect, element);
            }
            break;
        }
        default: {
            if ((0, element_7.isTextElement)(element)) {
                const node = svgRoot.ownerDocument.createElementNS(common_1.SVG_NS, "g");
                if (opacity !== 1) {
                    node.setAttribute("stroke-opacity", `${opacity}`);
                    node.setAttribute("fill-opacity", `${opacity}`);
                }
                node.setAttribute("transform", `translate(${offsetX || 0} ${offsetY || 0}) rotate(${degree} ${cx} ${cy})`);
                const lines = element.text.replace(/\r\n?/g, "\n").split("\n");
                const lineHeightPx = (0, element_6.getLineHeightInPx)(element.fontSize, element.lineHeight);
                const horizontalOffset = element.textAlign === "center"
                    ? element.width / 2
                    : element.textAlign === "right"
                        ? element.width
                        : 0;
                const verticalOffset = (0, common_1.getVerticalOffset)(element.fontFamily, element.fontSize, lineHeightPx);
                const direction = (0, common_1.isRTL)(element.text) ? "rtl" : "ltr";
                const textAnchor = element.textAlign === "center"
                    ? "middle"
                    : element.textAlign === "right" || direction === "rtl"
                        ? "end"
                        : "start";
                for (let i = 0; i < lines.length; i++) {
                    const text = svgRoot.ownerDocument.createElementNS(common_1.SVG_NS, "text");
                    text.textContent = lines[i];
                    text.setAttribute("x", `${horizontalOffset}`);
                    text.setAttribute("y", `${i * lineHeightPx + verticalOffset}`);
                    text.setAttribute("font-family", (0, common_1.getFontFamilyString)(element));
                    text.setAttribute("font-size", `${element.fontSize}px`);
                    text.setAttribute("fill", renderConfig.theme === common_1.THEME.DARK
                        ? (0, common_1.applyDarkModeFilter)(element.strokeColor)
                        : element.strokeColor);
                    text.setAttribute("text-anchor", textAnchor);
                    text.setAttribute("style", "white-space: pre;");
                    text.setAttribute("direction", direction);
                    text.setAttribute("dominant-baseline", "alphabetic");
                    node.appendChild(text);
                }
                const g = maybeWrapNodesInFrameClipPath(element, root, [node], renderConfig.frameRendering, elementsMap);
                addToRoot(g || node, element);
            }
            else {
                // @ts-ignore
                throw new Error(`Unimplemented type ${element.type}`);
            }
        }
    }
};
const renderSceneToSvg = (elements, elementsMap, rsvg, svgRoot, files, renderConfig) => {
    if (!svgRoot) {
        return;
    }
    // render elements
    elements
        .filter((el) => !(0, element_7.isIframeLikeElement)(el))
        .forEach((element) => {
        if (!element.isDeleted) {
            if ((0, element_7.isTextElement)(element) &&
                element.containerId &&
                elementsMap.has(element.containerId)) {
                // will be rendered with the container
                return;
            }
            try {
                renderElementToSvg(element, elementsMap, rsvg, svgRoot, files, element.x + renderConfig.offsetX, element.y + renderConfig.offsetY, renderConfig);
                const boundTextElement = (0, element_5.getBoundTextElement)(element, elementsMap);
                if (boundTextElement) {
                    renderElementToSvg(boundTextElement, elementsMap, rsvg, svgRoot, files, boundTextElement.x + renderConfig.offsetX, boundTextElement.y + renderConfig.offsetY, renderConfig);
                }
            }
            catch (error) {
                console.error(error);
            }
        }
    });
    // render embeddables on top
    elements
        .filter((el) => (0, element_7.isIframeLikeElement)(el))
        .forEach((element) => {
        if (!element.isDeleted) {
            try {
                renderElementToSvg(element, elementsMap, rsvg, svgRoot, files, element.x + renderConfig.offsetX, element.y + renderConfig.offsetY, renderConfig);
            }
            catch (error) {
                console.error(error);
            }
        }
    });
};
exports.renderSceneToSvg = renderSceneToSvg;
