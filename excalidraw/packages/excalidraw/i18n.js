"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.useI18n = exports.t = exports.getLanguage = exports.setLanguage = exports.languages = exports.defaultLang = void 0;
const common_1 = require("@excalidraw/common");
const editor_jotai_1 = require("./editor-jotai");
const en_json_1 = __importDefault(require("./locales/en.json"));
const percentages_json_1 = __importDefault(require("./locales/percentages.json"));
const COMPLETION_THRESHOLD = 85;
exports.defaultLang = { code: "en", label: "English" };
exports.languages = [
    exports.defaultLang,
    ...[
        { code: "ar-SA", label: "العربية", rtl: true },
        { code: "bg-BG", label: "Български" },
        { code: "ca-ES", label: "Català" },
        { code: "cs-CZ", label: "Česky" },
        { code: "de-DE", label: "Deutsch" },
        { code: "el-GR", label: "Ελληνικά" },
        { code: "es-ES", label: "Español" },
        { code: "eu-ES", label: "Euskara" },
        { code: "fa-IR", label: "فارسی", rtl: true },
        { code: "fi-FI", label: "Suomi" },
        { code: "fr-FR", label: "Français" },
        { code: "gl-ES", label: "Galego" },
        { code: "he-IL", label: "עברית", rtl: true },
        { code: "hi-IN", label: "हिन्दी" },
        { code: "hu-HU", label: "Magyar" },
        { code: "id-ID", label: "Bahasa Indonesia" },
        { code: "it-IT", label: "Italiano" },
        { code: "ja-JP", label: "日本語" },
        { code: "kab-KAB", label: "Taqbaylit" },
        { code: "kk-KZ", label: "Қазақ тілі" },
        { code: "ko-KR", label: "한국어" },
        { code: "ku-TR", label: "Kurdî" },
        { code: "lt-LT", label: "Lietuvių" },
        { code: "lv-LV", label: "Latviešu" },
        { code: "my-MM", label: "Burmese" },
        { code: "nb-NO", label: "Norsk bokmål" },
        { code: "nl-NL", label: "Nederlands" },
        { code: "nn-NO", label: "Norsk nynorsk" },
        { code: "oc-FR", label: "Occitan" },
        { code: "pa-IN", label: "ਪੰਜਾਬੀ" },
        { code: "pl-PL", label: "Polski" },
        { code: "pt-BR", label: "Português Brasileiro" },
        { code: "pt-PT", label: "Português" },
        { code: "ro-RO", label: "Română" },
        { code: "ru-RU", label: "Русский" },
        { code: "sk-SK", label: "Slovenčina" },
        { code: "sv-SE", label: "Svenska" },
        { code: "sl-SI", label: "Slovenščina" },
        { code: "tr-TR", label: "Türkçe" },
        { code: "uk-UA", label: "Українська" },
        { code: "zh-CN", label: "简体中文" },
        { code: "zh-TW", label: "繁體中文" },
        { code: "vi-VN", label: "Tiếng Việt" },
        { code: "mr-IN", label: "मराठी" },
    ]
        .filter((lang) => percentages_json_1.default[lang.code] >=
        COMPLETION_THRESHOLD)
        .sort((left, right) => (left.label > right.label ? 1 : -1)),
];
const TEST_LANG_CODE = "__test__";
if ((0, common_1.isDevEnv)()) {
    exports.languages.unshift({ code: TEST_LANG_CODE, label: "test language" }, {
        code: `${TEST_LANG_CODE}.rtl`,
        label: "\u{202a}test language (rtl)\u{202c}",
        rtl: true,
    });
}
let currentLang = exports.defaultLang;
let currentLangData = {};
const setLanguage = async (lang) => {
    currentLang = lang;
    document.documentElement.dir = currentLang.rtl ? "rtl" : "ltr";
    document.documentElement.lang = currentLang.code;
    if (lang.code.startsWith(TEST_LANG_CODE)) {
        currentLangData = {};
    }
    else {
        try {
            currentLangData = await Promise.resolve(`${`./locales/${currentLang.code}.json`}`).then(s => __importStar(require(s)));
        }
        catch (error) {
            console.error(`Failed to load language ${lang.code}:`, error.message);
            currentLangData = en_json_1.default;
        }
    }
    editor_jotai_1.editorJotaiStore.set(editorLangCodeAtom, lang.code);
};
exports.setLanguage = setLanguage;
const getLanguage = () => currentLang;
exports.getLanguage = getLanguage;
const findPartsForData = (data, parts) => {
    for (let index = 0; index < parts.length; ++index) {
        const part = parts[index];
        if (data[part] === undefined) {
            return undefined;
        }
        data = data[part];
    }
    if (typeof data !== "string") {
        return undefined;
    }
    return data;
};
const t = (path, replacement, fallback) => {
    if (currentLang.code.startsWith(TEST_LANG_CODE)) {
        const name = replacement
            ? `${path}(${JSON.stringify(replacement).slice(1, -1)})`
            : path;
        return `\u{202a}[[${name}]]\u{202c}`;
    }
    const parts = path.split(".");
    let translation = findPartsForData(currentLangData, parts) ||
        findPartsForData(en_json_1.default, parts) ||
        fallback;
    if (translation === undefined) {
        const errorMessage = `Can't find translation for ${path}`;
        // in production, don't blow up the app on a missing translation key
        if (import.meta.env.PROD) {
            console.warn(errorMessage);
            return "";
        }
        throw new Error(errorMessage);
    }
    if (replacement) {
        for (const key in replacement) {
            translation = translation.replace(`{{${key}}}`, String(replacement[key]));
        }
    }
    return translation;
};
exports.t = t;
/** @private atom used solely to rerender components using `useI18n` hook */
const editorLangCodeAtom = (0, editor_jotai_1.atom)(exports.defaultLang.code);
// Should be used in components that fall under these cases:
// - component is rendered as an <Excalidraw> child
// - component is rendered internally by <Excalidraw>, but the component
//   is memoized w/o being updated on `langCode`, `AppState`, or `UIAppState`
const useI18n = () => {
    const langCode = (0, editor_jotai_1.useAtomValue)(editorLangCodeAtom);
    return { t: exports.t, langCode };
};
exports.useI18n = useI18n;
