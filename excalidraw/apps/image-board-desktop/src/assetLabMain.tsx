import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "./app/App.css";
import { AssetLabApp } from "./app/dev/AssetLabApp";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Asset Lab root element not found.");
}

createRoot(rootElement).render(
  <StrictMode>
    <AssetLabApp />
  </StrictMode>,
);
