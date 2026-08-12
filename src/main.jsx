import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { RecoveryBoundary } from "./components/recovery-boundary";
import "./index.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <RecoveryBoundary fullScreen>
      <App />
    </RecoveryBoundary>
  </StrictMode>
);
