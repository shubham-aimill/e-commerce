import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import Dashboard from "./pages/Dashboard";
import MismatchEngine from "./pages/MismatchEngine";
import AIPhotoshoot from "./pages/AIPhotoshoot";
import ImageToText from "./pages/ImageToText";
import SQLAgent from "./pages/SQLAgent";
import ColorMismatch from "./pages/ColorMismatch";
import Settings from "./pages/Settings";
import Help from "./pages/Help";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <MainLayout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/mismatch" element={<MismatchEngine />} />
            <Route path="/photoshoot" element={<AIPhotoshoot />} />
            <Route path="/content" element={<ImageToText />} />
            <Route path="/agent" element={<SQLAgent />} />
            <Route path="/color-mismatch" element={<ColorMismatch />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/help" element={<Help />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </MainLayout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
