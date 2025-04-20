import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css"; // Your existing index.css
import "./styles.css"; // Import the styles.css file
import App from "./App.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
