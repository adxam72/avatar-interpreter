import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Loader2, Mail, Phone, Lock, User as UserIcon, ArrowLeft } from "lucide-react";
import logo from "@/assets/zehn-logo.png";

const Auth = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { user } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">(params.get("mode") === "signup" ? "signup" : "signin");
  const [method, setMethod] = useState<"email" | "phone">("email");
  const [loading, setLoading] = useState(false);

  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [isDeaf, setIsDeaf] = useState(false);

  useEffect(() => {
    if (user) navigate("/studio");
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === "signup") {
        const credentials = method === "email"
          ? { email, password }
          : { phone: phone.startsWith("+") ? phone : `+${phone}`, password };

        const { error } = await supabase.auth.signUp({
          ...credentials,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: { full_name: fullName, is_deaf: isDeaf },
          },
        });
        if (error) throw error;

        // Set phone in profile if signed up via email
        if (method === "email" && phone) {
          // Will be handled by trigger; phone stored separately later if needed
        }

        toast({ title: "Muvaffaqiyatli!", description: "Hisobingiz yaratildi. Endi kirishingiz mumkin." });
      } else {
        const credentials = method === "email"
          ? { email, password }
          : { phone: phone.startsWith("+") ? phone : `+${phone}`, password };

        const { error } = await supabase.auth.signInWithPassword(credentials);
        if (error) throw error;

        toast({ title: "Xush kelibsiz!", description: "Tizimga muvaffaqiyatli kirdingiz." });
      }
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Xatolik",
        description: err.message ?? "Noma'lum xatolik yuz berdi",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4">
      <div className="absolute inset-0 gradient-mesh" />
      <div className="absolute inset-0 bg-gradient-to-br from-primary-soft via-background to-primary-soft" />

      <Link to="/" className="absolute top-6 left-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-smooth z-10">
        <ArrowLeft className="h-4 w-4" /> Bosh sahifa
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-md"
      >
        <div className="glass-card rounded-3xl p-8 shadow-elegant">
          <div className="text-center mb-6">
            <Link to="/">
              <img src={logo} alt="Zehn AI" className="h-12 w-auto mx-auto mb-4" />
            </Link>
            <h1 className="text-2xl font-display font-bold">
              {mode === "signin" ? "Xush kelibsiz" : "Hisob yaratish"}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {mode === "signin" ? "Hisobingizga kiring" : "Bepul ro'yxatdan o'ting"}
            </p>
          </div>

          {/* Method toggle */}
          <div className="grid grid-cols-2 p-1 bg-muted rounded-full mb-6">
            <button
              type="button"
              onClick={() => setMethod("email")}
              className={`py-2 rounded-full text-sm font-medium transition-smooth flex items-center justify-center gap-2 ${
                method === "email" ? "bg-background shadow-soft text-foreground" : "text-muted-foreground"
              }`}
            >
              <Mail className="h-4 w-4" /> Email
            </button>
            <button
              type="button"
              onClick={() => setMethod("phone")}
              className={`py-2 rounded-full text-sm font-medium transition-smooth flex items-center justify-center gap-2 ${
                method === "phone" ? "bg-background shadow-soft text-foreground" : "text-muted-foreground"
              }`}
            >
              <Phone className="h-4 w-4" /> Telefon
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div className="space-y-1.5">
                <Label htmlFor="name">Ism</Label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="name"
                    placeholder="To'liq ismingiz"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    className="pl-10 rounded-xl"
                  />
                </div>
              </div>
            )}

            {method === "email" ? (
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="siz@misol.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="pl-10 rounded-xl"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label htmlFor="phone">Telefon raqam</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+998901234567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    className="pl-10 rounded-xl"
                  />
                </div>
                <p className="text-xs text-muted-foreground">Xalqaro formatda kiriting</p>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="password">Parol</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Kamida 6 ta belgi"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="pl-10 rounded-xl"
                />
              </div>
            </div>

            {mode === "signup" && (
              <label className="flex items-center gap-2 text-sm cursor-pointer p-3 rounded-xl bg-primary-soft/50 border border-primary/10">
                <input
                  type="checkbox"
                  checked={isDeaf}
                  onChange={(e) => setIsDeaf(e.target.checked)}
                  className="rounded accent-primary h-4 w-4"
                />
                <span>Men kar yoki zaif eshituvchiman</span>
              </label>
            )}

            <Button type="submit" variant="hero" size="lg" className="w-full" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === "signin" ? "Kirish" : "Ro'yxatdan o'tish"}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "signin" ? "Hisobingiz yo'qmi? " : "Hisobingiz bormi? "}
            <button
              type="button"
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
              className="text-primary font-medium hover:underline"
            >
              {mode === "signin" ? "Ro'yxatdan o'ting" : "Kiring"}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Auth;
