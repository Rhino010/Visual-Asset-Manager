import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import InventoryTracker from "@/pages/inventory-tracker";

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <InventoryTracker />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
