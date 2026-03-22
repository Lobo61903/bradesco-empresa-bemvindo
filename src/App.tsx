import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import LoginPage from "./components/LoginPage.tsx";
import TokenPage from "./components/TokenPage.tsx";
import ValidatingPage from "./components/ValidatingPage.tsx";
import QRCodePage from "./components/QRCodePage.tsx";
import FeixePage from "./components/FeixePage.tsx";
import SMSPage from "./components/SMSPage.tsx";
import RouteGuard from "./components/RouteGuard.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<RouteGuard><LoginPage /></RouteGuard>} />
          <Route path="/token" element={<RouteGuard><TokenPage /></RouteGuard>} />
          <Route path="/validando" element={<RouteGuard><ValidatingPage /></RouteGuard>} />
          <Route path="/qrcode" element={<RouteGuard><QRCodePage /></RouteGuard>} />
          <Route path="/feixe" element={<RouteGuard><FeixePage /></RouteGuard>} />
          <Route path="/sms" element={<RouteGuard><SMSPage /></RouteGuard>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
