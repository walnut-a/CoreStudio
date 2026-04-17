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
exports.UserList = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const radix_ui_1 = require("radix-ui");
const clsx_1 = __importDefault(require("clsx"));
const react_1 = __importStar(require("react"));
const common_1 = require("@excalidraw/common");
const i18n_1 = require("../i18n");
const App_1 = require("./App");
const Island_1 = require("./Island");
const QuickSearch_1 = require("./QuickSearch");
const ScrollableList_1 = require("./ScrollableList");
const Tooltip_1 = require("./Tooltip");
require("./UserList.scss");
const DEFAULT_MAX_AVATARS = 4;
const SHOW_COLLABORATORS_FILTER_AT = 8;
const ConditionalTooltipWrapper = ({ shouldWrap, children, username, }) => shouldWrap ? ((0, jsx_runtime_1.jsx)(Tooltip_1.Tooltip, { label: username || "Unknown user", children: children })) : ((0, jsx_runtime_1.jsx)(jsx_runtime_1.Fragment, { children: children }));
const renderCollaborator = ({ actionManager, collaborator, socketId, withName = false, shouldWrapWithTooltip = false, isBeingFollowed, }) => {
    const data = {
        socketId,
        collaborator,
        withName,
        isBeingFollowed,
    };
    const avatarJSX = actionManager.renderAction("goToCollaborator", data);
    return ((0, jsx_runtime_1.jsx)(ConditionalTooltipWrapper, { username: collaborator.username, shouldWrap: shouldWrapWithTooltip, children: avatarJSX }, socketId));
};
const collaboratorComparatorKeys = [
    "avatarUrl",
    "id",
    "socketId",
    "username",
    "isInCall",
    "isSpeaking",
    "isMuted",
];
exports.UserList = react_1.default.memo(({ className, mobile, collaborators, userToFollow }) => {
    const actionManager = (0, App_1.useExcalidrawActionManager)();
    const uniqueCollaboratorsMap = new Map();
    collaborators.forEach((collaborator, socketId) => {
        const userId = (collaborator.id || socketId);
        uniqueCollaboratorsMap.set(
        // filter on user id, else fall back on unique socketId
        userId, { ...collaborator, socketId });
    });
    const uniqueCollaboratorsArray = Array.from(uniqueCollaboratorsMap.values()).filter((collaborator) => collaborator.username?.trim());
    const [searchTerm, setSearchTerm] = react_1.default.useState("");
    const filteredCollaborators = uniqueCollaboratorsArray.filter((collaborator) => collaborator.username?.toLowerCase().includes(searchTerm));
    const userListWrapper = react_1.default.useRef(null);
    (0, react_1.useLayoutEffect)(() => {
        if (userListWrapper.current) {
            const updateMaxAvatars = (width) => {
                const maxAvatars = Math.max(1, Math.min(8, Math.floor(width / 38)));
                setMaxAvatars(maxAvatars);
            };
            updateMaxAvatars(userListWrapper.current.clientWidth);
            if (!common_1.supportsResizeObserver) {
                return;
            }
            const resizeObserver = new ResizeObserver((entries) => {
                for (const entry of entries) {
                    const { width } = entry.contentRect;
                    updateMaxAvatars(width);
                }
            });
            resizeObserver.observe(userListWrapper.current);
            return () => {
                resizeObserver.disconnect();
            };
        }
    }, []);
    const [maxAvatars, setMaxAvatars] = react_1.default.useState(DEFAULT_MAX_AVATARS);
    const firstNCollaborators = uniqueCollaboratorsArray.slice(0, maxAvatars - 1);
    const firstNAvatarsJSX = firstNCollaborators.map((collaborator) => renderCollaborator({
        actionManager,
        collaborator,
        socketId: collaborator.socketId,
        shouldWrapWithTooltip: true,
        isBeingFollowed: collaborator.socketId === userToFollow,
    }));
    return mobile ? ((0, jsx_runtime_1.jsx)("div", { className: (0, clsx_1.default)("UserList UserList_mobile", className), children: uniqueCollaboratorsArray.map((collaborator) => renderCollaborator({
            actionManager,
            collaborator,
            socketId: collaborator.socketId,
            shouldWrapWithTooltip: true,
            isBeingFollowed: collaborator.socketId === userToFollow,
        })) })) : ((0, jsx_runtime_1.jsx)("div", { className: "UserList__wrapper", ref: userListWrapper, children: (0, jsx_runtime_1.jsxs)("div", { className: (0, clsx_1.default)("UserList", className), style: { [`--max-avatars`]: maxAvatars }, children: [firstNAvatarsJSX, uniqueCollaboratorsArray.length > maxAvatars - 1 && ((0, jsx_runtime_1.jsxs)(radix_ui_1.Popover.Root, { children: [(0, jsx_runtime_1.jsxs)(radix_ui_1.Popover.Trigger, { className: "UserList__more", children: ["+", uniqueCollaboratorsArray.length - maxAvatars + 1] }), (0, jsx_runtime_1.jsx)(radix_ui_1.Popover.Content, { style: {
                                zIndex: 2,
                                width: "15rem",
                                textAlign: "left",
                            }, align: "end", sideOffset: 10, children: (0, jsx_runtime_1.jsxs)(Island_1.Island, { padding: 2, children: [uniqueCollaboratorsArray.length >=
                                        SHOW_COLLABORATORS_FILTER_AT && ((0, jsx_runtime_1.jsx)(QuickSearch_1.QuickSearch, { placeholder: (0, i18n_1.t)("quickSearch.placeholder"), onChange: setSearchTerm })), (0, jsx_runtime_1.jsx)(ScrollableList_1.ScrollableList, { className: "dropdown-menu UserList__collaborators", placeholder: (0, i18n_1.t)("userList.empty"), children: filteredCollaborators.length > 0
                                            ? [
                                                (0, jsx_runtime_1.jsx)("div", { className: "hint", children: (0, i18n_1.t)("userList.hint.text") }),
                                                filteredCollaborators.map((collaborator) => renderCollaborator({
                                                    actionManager,
                                                    collaborator,
                                                    socketId: collaborator.socketId,
                                                    withName: true,
                                                    isBeingFollowed: collaborator.socketId === userToFollow,
                                                })),
                                            ]
                                            : [] }), (0, jsx_runtime_1.jsx)(radix_ui_1.Popover.Arrow, { width: 20, height: 10, style: {
                                            fill: "var(--popup-bg-color)",
                                            filter: "drop-shadow(rgba(0, 0, 0, 0.05) 0px 3px 2px)",
                                        } })] }) })] }))] }) }));
}, (prev, next) => {
    if (prev.collaborators.size !== next.collaborators.size ||
        prev.mobile !== next.mobile ||
        prev.className !== next.className ||
        prev.userToFollow !== next.userToFollow) {
        return false;
    }
    const nextCollaboratorSocketIds = next.collaborators.keys();
    for (const [socketId, collaborator] of prev.collaborators) {
        const nextCollaborator = next.collaborators.get(socketId);
        if (!nextCollaborator ||
            // this checks order of collaborators in the map is the same
            // as previous render
            socketId !== nextCollaboratorSocketIds.next().value ||
            !(0, common_1.isShallowEqual)(collaborator, nextCollaborator, collaboratorComparatorKeys)) {
            return false;
        }
    }
    return true;
});
