"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.useInitializeTunnels = exports.useTunnels = exports.TunnelsContext = void 0;
const jotai_scope_1 = require("jotai-scope");
const react_1 = __importDefault(require("react"));
const tunnel_rat_1 = __importDefault(require("tunnel-rat"));
exports.TunnelsContext = react_1.default.createContext(null);
const useTunnels = () => react_1.default.useContext(exports.TunnelsContext);
exports.useTunnels = useTunnels;
const tunnelsJotai = (0, jotai_scope_1.createIsolation)();
const useInitializeTunnels = () => {
    return react_1.default.useMemo(() => {
        return {
            MainMenuTunnel: (0, tunnel_rat_1.default)(),
            WelcomeScreenMenuHintTunnel: (0, tunnel_rat_1.default)(),
            WelcomeScreenToolbarHintTunnel: (0, tunnel_rat_1.default)(),
            WelcomeScreenHelpHintTunnel: (0, tunnel_rat_1.default)(),
            WelcomeScreenCenterTunnel: (0, tunnel_rat_1.default)(),
            FooterCenterTunnel: (0, tunnel_rat_1.default)(),
            DefaultSidebarTriggerTunnel: (0, tunnel_rat_1.default)(),
            DefaultSidebarTabTriggersTunnel: (0, tunnel_rat_1.default)(),
            OverwriteConfirmDialogTunnel: (0, tunnel_rat_1.default)(),
            ToolbarToolsTunnel: (0, tunnel_rat_1.default)(),
            TTDDialogTriggerTunnel: (0, tunnel_rat_1.default)(),
            tunnelsJotai,
        };
    }, []);
};
exports.useInitializeTunnels = useInitializeTunnels;
