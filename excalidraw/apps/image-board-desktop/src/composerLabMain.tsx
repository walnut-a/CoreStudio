import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "./app/App.css";
import "./app/components/GenerateImageDialog.css";
import { ComposerLabApp } from "./app/dev/ComposerLabApp";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Composer Lab root element not found.");
}

createRoot(rootElement).render(
  <StrictMode>
    <ComposerLabApp />
  </StrictMode>,
);
