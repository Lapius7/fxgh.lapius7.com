import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "@/components/arc/foundation.css";
import "./page.css";
import "./transition.css";
import { App } from "./App";
import { ThemeTransitionProvider } from "@/components/transitions/theme-transition";

document.documentElement.dataset.accent = "green";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeTransitionProvider transition="circle-blur">
      <App />
    </ThemeTransitionProvider>
  </StrictMode>,
);
