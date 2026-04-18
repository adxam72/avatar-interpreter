import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { LogOut, Menu, X } from "lucide-react";
import { useState } from "react";
import logo from "@/assets/zehn-logo.png";
import { cn } from "@/lib/utils";

const navItems = [
  { path: "/dialog", label: "Dialog" },
  { path: "/chat", label: "Muloqot" },
  { path: "/zehntube", label: "ZehnTube" },
  { path: "/profile", label: "Profil" },
];

export const Navbar = () => {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-50 w-full">
      <div className="absolute inset-0 glass border-b border-primary/5" />
      <nav className="container relative flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <img src={logo} alt="Zehn AI" className="h-9 w-auto transition-spring group-hover:scale-110" />
        </Link>

        {user && (
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "px-4 py-2 rounded-full text-sm font-medium transition-smooth",
                  location.pathname === item.path
                    ? "bg-primary-soft text-primary-deep"
                    : "text-muted-foreground hover:text-foreground hover:bg-primary-soft/50"
                )}
              >
                {item.label}
              </Link>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2">
          {user ? (
            <>
              <Button variant="ghost" size="sm" onClick={handleSignOut} className="hidden md:flex">
                <LogOut className="h-4 w-4" />
                Chiqish
              </Button>
              <button
                className="md:hidden p-2 rounded-full hover:bg-primary-soft"
                onClick={() => setOpen(!open)}
                aria-label="Menyu"
              >
                {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/auth">Kirish</Link>
              </Button>
              <Button variant="hero" size="sm" asChild>
                <Link to="/auth?mode=signup">Boshlash</Link>
              </Button>
            </>
          )}
        </div>
      </nav>

      {/* Mobile menu */}
      {user && open && (
        <div className="md:hidden glass border-b border-primary/5 animate-fade-in">
          <div className="container py-4 flex flex-col gap-2">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setOpen(false)}
                className={cn(
                  "px-4 py-3 rounded-2xl text-sm font-medium transition-smooth",
                  location.pathname === item.path
                    ? "bg-primary-soft text-primary-deep"
                    : "text-muted-foreground hover:bg-primary-soft/50"
                )}
              >
                {item.label}
              </Link>
            ))}
            <Button variant="ghost" size="sm" onClick={handleSignOut} className="justify-start">
              <LogOut className="h-4 w-4" />
              Chiqish
            </Button>
          </div>
        </div>
      )}
    </header>
  );
};
