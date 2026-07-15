import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import App from "./app/App";
import {
  DesktopLocaleProvider,
  useDesktopLocale,
} from "./app/localization/DesktopLocaleProvider";

const LocalizedApp = () => {
  const { locale, preference, setPreference } = useDesktopLocale();
  return (
    <App
      locale={locale}
      localePreference={preference}
      onLocalePreferenceChange={setPreference}
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
    </DesktopLocaleProvider>
  </StrictMode>,
);
