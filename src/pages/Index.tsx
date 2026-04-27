import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { SignAvatar } from "@/components/SignAvatar";
import { useSignPlayer } from "@/hooks/useSignPlayer";
import { useEffect } from "react";
import { ArrowRight, Hand, Camera, MessageCircle, Youtube, Sparkles, Globe, Zap, Users } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const features = [
  {
    icon: Hand,
    title: "Dialog",
    desc: "Bir ekranda — siz ishora qiling, avatar ko'rsatsin. Ikki tomonlama tarjima.",
    href: "/dialog",
    color: "from-blue-500 to-blue-600",
  },
  {
    icon: Camera,
    title: "Aniqlash AI",
    desc: "MediaPipe 543 nuqta orqali imo-ishorangizni real vaqtda matnga aylantiradi.",
    href: "/dialog",
    color: "from-cyan-500 to-blue-500",
  },
  {
    icon: MessageCircle,
    title: "Muloqot",
    desc: "Telefon raqam orqali kar va sog' insonlar suhbat qiladi.",
    href: "/chat",
    color: "from-blue-600 to-indigo-600",
  },
  {
    icon: Youtube,
    title: "ZehnTube",
    desc: "YouTube videolar yonida jonli surdo tarjimon avatari.",
    href: "/zehntube",
    color: "from-indigo-500 to-blue-700",
  },
];

const stats = [
  { value: "70M+", label: "Dunyodagi kar insonlar" },
  { value: "543", label: "Aniqlanadigan nuqta" },
  { value: "3D", label: "Real vaqt avatar" },
  { value: "AI", label: "Aqlli tarjimon" },
];

const Index = () => {
  const { user } = useAuth();
  const player = useSignPlayer();

  useEffect(() => {
    const t = setTimeout(() => player.play("salom"), 1500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 gradient-mesh" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background" />

        <div className="container relative pt-12 pb-20 md:pt-20 md:pb-32 grid lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-6"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-soft border border-primary/10 text-sm text-primary-deep">
              <Sparkles className="h-3.5 w-3.5" />
              Sun'iy intellekt asosida
            </div>

            <h1 className="text-5xl md:text-6xl lg:text-7xl font-display font-bold leading-[1.05] tracking-tight">
              Eshitish chegarasini{" "}
              <span className="gradient-text">buzamiz</span>
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground max-w-xl leading-relaxed">
              <strong className="text-foreground">Zehn AI</strong> — kar, zaif eshituvchi va soqovlarni
              butun dunyo bilan bog'lovchi zamonaviy AI platforma. 3D avatar imo-ishora qiladi,
              kamera ishoralarni o'qiydi.
            </p>

            <div className="flex flex-wrap gap-4 pt-4">
              <Button variant="hero" size="xl" asChild className="shadow-glow">
                <Link to={user ? "/dialog" : "/auth?mode=signup"}>
                  Bepul boshlash <ArrowRight className="h-5 w-5" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <a href="#how">Qanday ishlaydi?</a>
              </Button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-8">
              {stats.map((s) => (
                <div key={s.label}>
                  <div className="text-2xl md:text-3xl font-display font-bold gradient-text">{s.value}</div>
                  <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative flex items-center justify-center"
          >
            <div className="absolute -inset-12 gradient-hero opacity-20 blur-3xl rounded-full" />
            <div className="relative w-full max-w-lg aspect-[3/4] mx-auto">
              <div className="absolute inset-0 glass-card rounded-[2rem] overflow-hidden">
                <SignAvatar pose={player.currentPose} />
              </div>
              <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 glass px-5 py-2.5 rounded-full text-sm font-medium shadow-elegant whitespace-nowrap">
                {player.currentWord ? (
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
                    "{player.currentWord}"
                  </span>
                ) : (
                  <span className="text-muted-foreground">Sizning AI tarjimoningiz</span>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="container py-20" id="features">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-4xl md:text-5xl font-display font-bold mb-4">
            To'rt asosiy <span className="gradient-text">funksiya</span>
          </h2>
          <p className="text-muted-foreground text-lg">
            Har bir funksiya — kar va sog' insonlar o'rtasidagi ko'prik.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
            >
              <Link to={user ? f.href : "/auth"} className="group block h-full">
                <div className="h-full glass-card rounded-3xl p-6 transition-spring hover:-translate-y-2 hover:shadow-elegant">
                  <div className={`inline-flex p-3 rounded-2xl bg-gradient-to-br ${f.color} text-white mb-4 shadow-soft`}>
                    <f.icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-xl font-display font-semibold mb-2">{f.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                  <div className="flex items-center gap-1 mt-4 text-sm font-medium text-primary opacity-0 group-hover:opacity-100 transition-smooth">
                    Ochish <ArrowRight className="h-4 w-4" />
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* HOW */}
      <section id="how" className="container py-20">
        <div className="glass-card rounded-[2.5rem] p-8 md:p-16 relative overflow-hidden">
          <div className="absolute inset-0 gradient-mesh opacity-50" />
          <div className="relative">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <h2 className="text-4xl md:text-5xl font-display font-bold mb-4">
                Qanday <span className="gradient-text">ishlaydi?</span>
              </h2>
              <p className="text-muted-foreground text-lg">
                Uch oddiy qadamda imo-ishora tilini har kim tushunadi.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 relative">
              <div className="hidden md:block absolute top-10 left-[20%] right-[20%] h-0.5 bg-gradient-to-r from-primary/20 via-primary/40 to-primary/20" />
              {[
                { icon: Globe, num: "01", title: "Matn yoki ovoz", desc: "Sog' inson o'z fikrini matn ko'rinishida yozadi yoki video joylaydi." },
                { icon: Zap, num: "02", title: "AI qayta ishlash", desc: "Zehn AI matnni surdo tilidagi ketma-ketlikka aylantiradi." },
                { icon: Users, num: "03", title: "3D avatar tarjima qiladi", desc: "Real, jonli avatar imo-ishorada kar insonga ko'rsatadi." },
              ].map((s, i) => (
                <motion.div
                  key={s.num}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.15 }}
                  className="relative text-center"
                >
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 border-2 border-primary/20 mb-6 relative">
                    <s.icon className="h-8 w-8 text-primary" />
                    <span className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shadow-soft">
                      {s.num}
                    </span>
                  </div>
                  <h3 className="text-xl font-display font-semibold mb-2">{s.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{s.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container py-20">
        <div className="relative overflow-hidden rounded-[2.5rem] gradient-hero p-12 md:p-20 text-center text-primary-foreground shadow-elegant">
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 30% 20%, white, transparent 40%)" }} />
          <div className="relative max-w-2xl mx-auto space-y-6">
            <h2 className="text-4xl md:text-5xl font-display font-bold">
              Ovozsiz dunyoga ovoz beraylik
            </h2>
            <p className="text-lg opacity-90">
              Bepul ro'yxatdan o'ting va Zehn AI ning barcha funksiyalarini sinab ko'ring.
            </p>
            <Button variant="glass" size="xl" asChild>
              <Link to={user ? "/dialog" : "/auth?mode=signup"}>
                Hoziroq boshlash <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;
