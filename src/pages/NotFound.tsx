import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background gradient-mesh p-4">
      <div className="text-center space-y-6 max-w-md">
        <div className="text-8xl font-display font-bold gradient-text">404</div>
        <h1 className="text-2xl font-display font-semibold">Sahifa topilmadi</h1>
        <p className="text-muted-foreground">
          Siz qidirgan sahifa mavjud emas yoki ko'chirilgan.
        </p>
        <Button variant="hero" size="lg" asChild>
          <Link to="/"><Home className="h-4 w-4" /> Bosh sahifaga qaytish</Link>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
