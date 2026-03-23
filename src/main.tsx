import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initAntiDebug } from "./lib/antiDebug";

// Initialize anti-debugging protections in production
initAntiDebug();

createRoot(document.getElementById("root")!).render(<App />);
