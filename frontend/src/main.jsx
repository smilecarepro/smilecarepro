import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

console.log("--- SmileCare React App Initializing ---");
console.log("Root element:", document.getElementById("root"));

import { registerSW } from 'virtual:pwa-register';

if (localStorage.getItem("light-mode") === "true") {
  document.body.classList.add("light-mode");
}

// Register service worker and actively check for updates
const updateSW = registerSW({
  onRegisteredSW(swUrl, r) {
    if (r) {
      // Check for updates every 5 minutes when app is open
      setInterval(() => {
        r.update();
      }, 5 * 60 * 1000);
      
      // Also check on visibility change (when user comes back to the tab/app)
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          r.update();
        }
      });
    }
  }
});

// Force reload when a new PWA version is pushed and the service worker takes over
if ('serviceWorker' in navigator) {
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      refreshing = true;
      window.location.reload();
    }
  });
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
