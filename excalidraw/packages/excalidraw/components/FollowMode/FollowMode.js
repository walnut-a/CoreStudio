"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
const icons_1 = require("../icons");
require("./FollowMode.scss");
const FollowMode = ({ height, width, userToFollow, onDisconnect, }) => {
    return ((0, jsx_runtime_1.jsx)("div", { className: "follow-mode", style: { width, height }, children: (0, jsx_runtime_1.jsxs)("div", { className: "follow-mode__badge", children: [(0, jsx_runtime_1.jsxs)("div", { className: "follow-mode__badge__label", children: ["Following", " ", (0, jsx_runtime_1.jsx)("span", { className: "follow-mode__badge__username", title: userToFollow.username, children: userToFollow.username })] }), (0, jsx_runtime_1.jsx)("button", { type: "button", onClick: onDisconnect, className: "follow-mode__disconnect-btn", children: icons_1.CloseIcon })] }) }));
};
exports.default = FollowMode;
