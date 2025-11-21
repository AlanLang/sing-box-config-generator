import { Button } from "@/components/ui/button";
import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";

export function ButtonDemo() {
  return (
    <div className="flex flex-wrap items-center gap-2 md:flex-row">
      <Button variant="outline">Button</Button>
    </div>
  );
}

function App() {
  return (
    <div>
      <h1 className="text-red-400 text-3xl font-bold underline hover:text-blue-500">
        Hello world!
      </h1>
      <ButtonDemo />
    </div>
  );
}

const rootEl = document.getElementById("root");
if (rootEl) {
  const root = ReactDOM.createRoot(rootEl);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}
