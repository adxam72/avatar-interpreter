import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Loader2 } from "lucide-react";

const Index = lazy(() => import("./pages/Index.tsx"));
const Auth = lazy(() => import("./pages/Auth.tsx"));
const Dialog = lazy(() => import("./pages/Dialog.tsx"));
const Chat = lazy(() => import("./pages/Chat.tsx"));
const ZehnTube = lazy(() => import("./pages/ZehnTube.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));

const PageLoader = () => (
  <div className="min-h-screen flex flex-col items-center justify-center gap-4">
    <div className="relative">
      <div className="h-16 w-16 rounded-2xl bg-primary/10 animate-pulse" />
      <Loader2 className="h-6 w-6 animate-spin text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
    </div>
    <div className="space-y-2 flex flex-col items-center">
      <div className="h-3 w-32 rounded-full bg-muted animate-pulse" />
      <div className="h-2 w-20 rounded-full bg-muted/60 animate-pulse" />
    </div>
  </div>
);

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Suspense fallback={<PageLoader />}>
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
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
