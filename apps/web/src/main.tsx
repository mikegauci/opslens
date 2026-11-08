import "@opslens/ui/theme.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Foundation } from "./foundation";
import { Overview } from "./overview";
import "./style.css";

const root = document.getElementById("root");
if (!root) throw new Error("Missing application root");
createRoot(root).render(
  <StrictMode>
    {location.pathname === "/foundation" ? <Foundation /> : <Overview />}
  </StrictMode>,
);
