"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Fonts = void 0;
const common_1 = require("@excalidraw/common");
const element_1 = require("@excalidraw/element");
const element_2 = require("@excalidraw/element");
const element_3 = require("@excalidraw/element");
const common_2 = require("@excalidraw/common");
const element_4 = require("@excalidraw/element");
const element_5 = require("@excalidraw/element");
const Cascadia_1 = require("./Cascadia");
const ComicShanns_1 = require("./ComicShanns");
const Emoji_1 = require("./Emoji");
const ExcalidrawFontFace_1 = require("./ExcalidrawFontFace");
const Excalifont_1 = require("./Excalifont");
const Helvetica_1 = require("./Helvetica");
const Liberation_1 = require("./Liberation");
const Lilita_1 = require("./Lilita");
const Nunito_1 = require("./Nunito");
const Virgil_1 = require("./Virgil");
const Xiaolai_1 = require("./Xiaolai");
class Fonts {
    // it's ok to track fonts across multiple instances only once, so let's use
    // a static member to reduce memory footprint
    static loadedFontsCache = new Set();
    static _registered;
    static _initialized = false;
    static get registered() {
        // lazy load the font registration
        if (!Fonts._registered) {
            Fonts._registered = Fonts.init();
        }
        else if (!Fonts._initialized) {
            // case when host app register fonts before they are lazy loaded
            // don't override whatever has been previously registered
            Fonts._registered = new Map([
                ...Fonts.init().entries(),
                ...Fonts._registered.entries(),
            ]);
        }
        return Fonts._registered;
    }
    get registered() {
        return Fonts.registered;
    }
    scene;
    constructor(scene) {
        this.scene = scene;
    }
    /**
     * Get all the font families for the given scene.
     */
    getSceneFamilies = () => {
        return Fonts.getUniqueFamilies(this.scene.getNonDeletedElements());
    };
    /**
     * if we load a (new) font, it's likely that text elements using it have
     * already been rendered using a fallback font. Thus, we want invalidate
     * their shapes and rerender. See #637.
     *
     * Invalidates text elements and rerenders scene, provided that at least one
     * of the supplied fontFaces has not already been processed.
     */
    onLoaded = (fontFaces) => {
        // bail if all fonts with have been processed. We're checking just a
        // subset of the font properties (though it should be enough), so it
        // can technically bail on a false positive.
        let shouldBail = true;
        for (const fontFace of fontFaces) {
            const sig = `${fontFace.family}-${fontFace.style}-${fontFace.weight}-${fontFace.unicodeRange}`;
            // make sure to update our cache with all the loaded font faces
            if (!Fonts.loadedFontsCache.has(sig)) {
                Fonts.loadedFontsCache.add(sig);
                shouldBail = false;
            }
        }
        if (shouldBail) {
            return;
        }
        let didUpdate = false;
        const elementsMap = this.scene.getNonDeletedElementsMap();
        for (const element of this.scene.getNonDeletedElements()) {
            if ((0, element_5.isTextElement)(element)) {
                didUpdate = true;
                element_4.ShapeCache.delete(element);
                // clear the width cache, so that we don't perform subsequent wrapping based on the stale fallback font metrics
                element_2.charWidth.clearCache((0, common_2.getFontString)(element));
                const container = (0, element_1.getContainerElement)(element, elementsMap);
                if (container) {
                    element_4.ShapeCache.delete(container);
                }
            }
        }
        if (didUpdate) {
            this.scene.triggerUpdate();
        }
    };
    /**
     * Load font faces for a given scene and trigger scene update.
     */
    loadSceneFonts = async () => {
        const sceneFamilies = this.getSceneFamilies();
        const charsPerFamily = Fonts.getCharsPerFamily(this.scene.getNonDeletedElements());
        return Fonts.loadFontFaces(sceneFamilies, charsPerFamily);
    };
    /**
     * Load font faces for passed elements - use when the scene is unavailable (i.e. export).
     */
    static loadElementsFonts = async (elements) => {
        const fontFamilies = Fonts.getUniqueFamilies(elements);
        const charsPerFamily = Fonts.getCharsPerFamily(elements);
        return Fonts.loadFontFaces(fontFamilies, charsPerFamily);
    };
    /**
     * Generate CSS @font-face declarations for the given elements.
     */
    static async generateFontFaceDeclarations(elements) {
        const families = Fonts.getUniqueFamilies(elements);
        const charsPerFamily = Fonts.getCharsPerFamily(elements);
        // for simplicity, assuming we have just one family with the CJK handdrawn fallback
        const familyWithCJK = families.find((x) => (0, common_1.getFontFamilyFallbacks)(x).includes(common_1.CJK_HAND_DRAWN_FALLBACK_FONT));
        if (familyWithCJK) {
            const characters = Fonts.getCharacters(charsPerFamily, familyWithCJK);
            if ((0, element_3.containsCJK)(characters)) {
                const family = common_1.FONT_FAMILY_FALLBACKS[common_1.CJK_HAND_DRAWN_FALLBACK_FONT];
                // adding the same characters to the CJK handrawn family
                charsPerFamily[family] = new Set(characters);
                // the order between the families and fallbacks is important, as fallbacks need to be defined first and in the reversed order
                // so that they get overriden with the later defined font faces, i.e. in case they share some codepoints
                families.unshift(common_1.FONT_FAMILY_FALLBACKS[common_1.CJK_HAND_DRAWN_FALLBACK_FONT]);
            }
        }
        // don't trigger hundreds of concurrent requests (each performing fetch, creating a worker, etc.),
        // instead go three requests at a time, in a controlled manner, without completely blocking the main thread
        // and avoiding potential issues such as rate limits
        const iterator = Fonts.fontFacesStylesGenerator(families, charsPerFamily);
        const concurrency = 3;
        const fontFaces = await new common_2.PromisePool(iterator, concurrency).all();
        // dedup just in case (i.e. could be the same font faces with 0 glyphs)
        return Array.from(new Set(fontFaces));
    }
    static async loadFontFaces(fontFamilies, charsPerFamily) {
        // add all registered font faces into the `document.fonts` (if not added already)
        for (const { fontFaces, metadata } of Fonts.registered.values()) {
            // skip registering font faces for local fonts (i.e. Helvetica)
            if (metadata.local) {
                continue;
            }
            for (const { fontFace } of fontFaces) {
                if (!window.document.fonts.has(fontFace)) {
                    window.document.fonts.add(fontFace);
                }
            }
        }
        // loading 10 font faces at a time, in a controlled manner
        const iterator = Fonts.fontFacesLoader(fontFamilies, charsPerFamily);
        const concurrency = 10;
        const fontFaces = await new common_2.PromisePool(iterator, concurrency).all();
        return fontFaces.flat().filter(Boolean);
    }
    static *fontFacesLoader(fontFamilies, charsPerFamily) {
        for (const [index, fontFamily] of fontFamilies.entries()) {
            const font = (0, common_2.getFontString)({
                fontFamily,
                fontSize: common_1.FONT_SIZES.sm,
            });
            // WARN: without "text" param it does not have to mean that all font faces are loaded as it could be just one irrelevant font face!
            // instead, we are always checking chars used in the family, so that no required font faces remain unloaded
            const text = Fonts.getCharacters(charsPerFamily, fontFamily);
            if (!window.document.fonts.check(font, text)) {
                yield (0, common_2.promiseTry)(async () => {
                    try {
                        // WARN: browser prioritizes loading only font faces with unicode ranges for characters which are present in the document (html & canvas), other font faces could stay unloaded
                        // we might want to retry here, i.e.  in case CDN is down, but so far I didn't experience any issues - maybe it handles retry-like logic under the hood
                        const fontFaces = await window.document.fonts.load(font, text);
                        return [index, fontFaces];
                    }
                    catch (e) {
                        // don't let it all fail if just one font fails to load
                        console.error(`Failed to load font "${font}" from urls "${Fonts.registered
                            .get(fontFamily)
                            ?.fontFaces.map((x) => x.urls)}"`, e);
                    }
                });
            }
        }
    }
    static *fontFacesStylesGenerator(families, charsPerFamily) {
        for (const [familyIndex, family] of families.entries()) {
            const { fontFaces, metadata } = Fonts.registered.get(family) ?? {};
            if (!Array.isArray(fontFaces)) {
                console.error(`Couldn't find registered fonts for font-family "${family}"`, Fonts.registered);
                continue;
            }
            if (metadata?.local) {
                // don't inline local fonts
                continue;
            }
            for (const [fontFaceIndex, fontFace] of fontFaces.entries()) {
                yield (0, common_2.promiseTry)(async () => {
                    try {
                        const characters = Fonts.getCharacters(charsPerFamily, family);
                        const fontFaceCSS = await fontFace.toCSS(characters);
                        if (!fontFaceCSS) {
                            return;
                        }
                        // giving a buffer of 10K font faces per family
                        const fontFaceOrder = familyIndex * 10_000 + fontFaceIndex;
                        const fontFaceTuple = [fontFaceOrder, fontFaceCSS];
                        return fontFaceTuple;
                    }
                    catch (error) {
                        console.error(`Couldn't transform font-face to css for family "${fontFace.fontFace.family}"`, error);
                    }
                });
            }
        }
    }
    /**
     * Register a new font.
     *
     * @param family font family
     * @param metadata font metadata
     * @param fontFacesDecriptors font faces descriptors
     */
    static register(family, metadata, ...fontFacesDecriptors) {
        // TODO: likely we will need to abandon number value in order to support custom fonts
        const fontFamily = common_1.FONT_FAMILY[family] ??
            common_1.FONT_FAMILY_FALLBACKS[family];
        const registeredFamily = this.registered.get(fontFamily);
        if (!registeredFamily) {
            this.registered.set(fontFamily, {
                metadata,
                fontFaces: fontFacesDecriptors.map(({ uri, descriptors }) => new ExcalidrawFontFace_1.ExcalidrawFontFace(family, uri, descriptors)),
            });
        }
        return this.registered;
    }
    /**
     * WARN: should be called just once on init, even across multiple instances.
     */
    static init() {
        const fonts = {
            registered: new Map(),
        };
        const init = (family, ...fontFacesDescriptors) => {
            const fontFamily = common_1.FONT_FAMILY[family] ??
                common_1.FONT_FAMILY_FALLBACKS[family];
            // default to Excalifont metrics
            const metadata = common_2.FONT_METADATA[fontFamily] ?? common_2.FONT_METADATA[common_1.FONT_FAMILY.Excalifont];
            Fonts.register.call(fonts, family, metadata, ...fontFacesDescriptors);
        };
        init("Cascadia", ...Cascadia_1.CascadiaFontFaces);
        init("Comic Shanns", ...ComicShanns_1.ComicShannsFontFaces);
        init("Excalifont", ...Excalifont_1.ExcalifontFontFaces);
        // keeping for backwards compatibility reasons, uses system font (Helvetica on MacOS, Arial on Win)
        init("Helvetica", ...Helvetica_1.HelveticaFontFaces);
        // used for server-side pdf & png export instead of helvetica (technically does not need metrics, but kept in for consistency)
        init("Liberation Sans", ...Liberation_1.LiberationFontFaces);
        init("Lilita One", ...Lilita_1.LilitaFontFaces);
        init("Nunito", ...Nunito_1.NunitoFontFaces);
        init("Virgil", ...Virgil_1.VirgilFontFaces);
        // fallback font faces
        init(common_1.CJK_HAND_DRAWN_FALLBACK_FONT, ...Xiaolai_1.XiaolaiFontFaces);
        init(common_1.WINDOWS_EMOJI_FALLBACK_FONT, ...Emoji_1.EmojiFontFaces);
        Fonts._initialized = true;
        return fonts.registered;
    }
    /**
     * Get all the unique font families for the given elements.
     */
    static getUniqueFamilies(elements) {
        return Array.from(elements.reduce((families, element) => {
            if ((0, element_5.isTextElement)(element)) {
                families.add(element.fontFamily);
            }
            return families;
        }, new Set()));
    }
    /**
     * Get all the unique characters per font family for the given scene.
     */
    static getCharsPerFamily(elements) {
        const charsPerFamily = {};
        for (const element of elements) {
            if (!(0, element_5.isTextElement)(element)) {
                continue;
            }
            // gather unique codepoints only when inlining fonts
            for (const char of element.originalText) {
                if (!charsPerFamily[element.fontFamily]) {
                    charsPerFamily[element.fontFamily] = new Set();
                }
                charsPerFamily[element.fontFamily].add(char);
            }
        }
        return charsPerFamily;
    }
    /**
     * Get characters for a given family.
     */
    static getCharacters(charsPerFamily, family) {
        return charsPerFamily[family]
            ? Array.from(charsPerFamily[family]).join("")
            : "";
    }
    /**
     * Get all registered font families.
     */
    static getAllFamilies() {
        return Array.from(Fonts.registered.keys());
    }
}
exports.Fonts = Fonts;
