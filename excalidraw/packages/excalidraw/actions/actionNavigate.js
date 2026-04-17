"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.actionGoToCollaborator = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const clsx_1 = __importDefault(require("clsx"));
const element_1 = require("@excalidraw/element");
const common_1 = require("@excalidraw/common");
const clients_1 = require("../clients");
const Avatar_1 = require("../components/Avatar");
const icons_1 = require("../components/icons");
const i18n_1 = require("../i18n");
const register_1 = require("./register");
exports.actionGoToCollaborator = (0, register_1.register)({
    name: "goToCollaborator",
    label: "Go to a collaborator",
    viewMode: true,
    trackEvent: { category: "collab" },
    perform: (_elements, appState, collaborator) => {
        (0, common_1.invariant)(collaborator, "actionGoToCollaborator: collaborator should be defined when actionGoToCollaborator is called");
        if (!collaborator.socketId ||
            appState.userToFollow?.socketId === collaborator.socketId ||
            collaborator.isCurrentUser) {
            return {
                appState: {
                    ...appState,
                    userToFollow: null,
                },
                captureUpdate: element_1.CaptureUpdateAction.EVENTUALLY,
            };
        }
        return {
            appState: {
                ...appState,
                userToFollow: {
                    socketId: collaborator.socketId,
                    username: collaborator.username || "",
                },
                // Close mobile menu
                openMenu: appState.openMenu === "canvas" ? null : appState.openMenu,
            },
            captureUpdate: element_1.CaptureUpdateAction.EVENTUALLY,
        };
    },
    PanelComponent: ({ updateData, data, appState }) => {
        const { socketId, collaborator, withName, isBeingFollowed } = data;
        const background = (0, clients_1.getClientColor)(socketId, collaborator);
        const statusClassNames = (0, clsx_1.default)({
            "is-followed": isBeingFollowed,
            "is-current-user": collaborator.isCurrentUser === true,
            "is-speaking": collaborator.isSpeaking,
            "is-in-call": collaborator.isInCall,
            "is-muted": collaborator.isMuted,
        });
        const statusIconJSX = collaborator.isInCall ? (collaborator.isSpeaking ? ((0, jsx_runtime_1.jsxs)("div", { className: "UserList__collaborator-status-icon-speaking-indicator", title: (0, i18n_1.t)("userList.hint.isSpeaking"), children: [(0, jsx_runtime_1.jsx)("div", {}), (0, jsx_runtime_1.jsx)("div", {}), (0, jsx_runtime_1.jsx)("div", {})] })) : collaborator.isMuted ? ((0, jsx_runtime_1.jsx)("div", { className: "UserList__collaborator-status-icon-microphone-muted", title: (0, i18n_1.t)("userList.hint.micMuted"), children: icons_1.microphoneMutedIcon })) : ((0, jsx_runtime_1.jsx)("div", { title: (0, i18n_1.t)("userList.hint.inCall"), children: icons_1.microphoneIcon }))) : null;
        return withName ? ((0, jsx_runtime_1.jsxs)("div", { className: `dropdown-menu-item dropdown-menu-item-base UserList__collaborator ${statusClassNames}`, style: { [`--avatar-size`]: "1.5rem" }, onClick: () => updateData(collaborator), children: [(0, jsx_runtime_1.jsx)(Avatar_1.Avatar, { color: background, onClick: () => { }, name: collaborator.username || "", src: collaborator.avatarUrl, className: statusClassNames }), (0, jsx_runtime_1.jsx)("div", { className: "UserList__collaborator-name", children: collaborator.username }), (0, jsx_runtime_1.jsxs)("div", { className: "UserList__collaborator-status-icons", "aria-hidden": true, children: [isBeingFollowed && ((0, jsx_runtime_1.jsx)("div", { className: "UserList__collaborator-status-icon-is-followed", title: (0, i18n_1.t)("userList.hint.followStatus"), children: icons_1.eyeIcon })), statusIconJSX] })] })) : ((0, jsx_runtime_1.jsxs)("div", { className: `UserList__collaborator UserList__collaborator--avatar-only ${statusClassNames}`, children: [(0, jsx_runtime_1.jsx)(Avatar_1.Avatar, { color: background, onClick: () => {
                        updateData(collaborator);
                    }, name: collaborator.username || "", src: collaborator.avatarUrl, className: statusClassNames }), statusIconJSX && ((0, jsx_runtime_1.jsx)("div", { className: "UserList__collaborator-status-icon", children: statusIconJSX }))] }));
    },
});
