import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import App from "./app/App";
import { DesktopShellApp } from "./app/DesktopShellApp";
import { RuntimeIdentityBadge } from "./app/components/RuntimeIdentityBadge";
import {
  DesktopLocaleProvider,
  useDesktopLocale,
} from "./app/localization/DesktopLocaleProvider";
import { parseDesktopRendererRoute } from "./shared/desktopRendererRoute";

const LocalizedApp = () => {
  const { locale, preference, setPreference } = useDesktopLocale();
  const route = parseDesktopRendererRoute(window.location.href);
  if (route.mode === "shell") {
    return (
      <DesktopShellApp
        localePreference={preference}
        onLocalePreferenceChange={setPreference}
      />
    );
  }
  return (
    <App
      locale={locale}
      localePreference={preference}
      onLocalePreferenceChange={setPreference}
      desktopProjectPath={
        route.mode === "project" ? route.projectPath : undefined
      }
    />
  );
};

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element not found.");
}

createRoot(rootElement).render(
  <StrictMode>
    <DesktopLocaleProvider>
      <LocalizedApp />
      <RuntimeIdentityBadge />
    </DesktopLocaleProvider>
  </StrictMode>,
);
