import { createRouter, RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { routeTree } from "./routes/routeTree.gen";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { toast, Toaster } from "sonner";
import { extractErrorMessage } from "./lib/error";
import "./index.css";

// Create a new router instance
const router = createRouter({
  routeTree,
  defaultPreload: "intent",
  // Disable dev tools in production
});

// Register the router instance for type safety
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

// Render the app
const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element not found");
}
if (!rootElement.innerHTML) {
  const root = createRoot(rootElement);
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: {
        onError: async (error: any) => {
          const errorMessage = await extractErrorMessage(error);
          toast.error(errorMessage);
        },
      },
    },
  });
  root.render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <Toaster richColors />
        <RouterProvider router={router} />
      </QueryClientProvider>
    </StrictMode>,
  );
}
