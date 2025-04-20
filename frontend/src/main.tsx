import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css"; // Import the styles.css file
import App from "./App.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
