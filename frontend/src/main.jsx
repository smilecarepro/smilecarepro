import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

console.log("--- SmileCare React App Initializing ---");
console.log("Root element:", document.getElementById("root"));

if (localStorage.getItem("light-mode") === "true") {
  document.body.classList.add("light-mode");
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
