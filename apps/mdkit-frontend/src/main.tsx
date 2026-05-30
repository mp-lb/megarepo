import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.tsx";
import { logger } from "./logger";
import "./index.css";

window.addEventListener("error", (event) => {
  logger.error(
    "window.error",
    {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      stack: event.error?.stack,
    },
    { message: event.message },
  );
});

window.addEventListener("unhandledrejection", (event) => {
  const err =
    event.reason instanceof Error
      ? event.reason
      : new Error(String(event.reason));

  logger.error(
    "window.unhandledRejection",
    { stack: err.stack, name: err.name },
    { message: err.message },
  );
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
