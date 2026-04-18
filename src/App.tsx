import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index.tsx";
import Auth from "./pages/Auth.tsx";
import Dialog from "./pages/Dialog.tsx";
import Chat from "./pages/Chat.tsx";
import ZehnTube from "./pages/ZehnTube.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dialog" element={<ProtectedRoute><Dialog /></ProtectedRoute>} />
            {/* Legacy routes redirect to unified Dialog */}
            <Route path="/studio" element={<ProtectedRoute><Dialog /></ProtectedRoute>} />
            <Route path="/recognize" element={<ProtectedRoute><Dialog /></ProtectedRoute>} />
            <Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
            <Route path="/zehntube" element={<ProtectedRoute><ZehnTube /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
