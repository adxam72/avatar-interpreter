import { useState } from "react";
import { motion } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { SignAvatar } from "@/components/SignAvatar";
import { useSignPlayer } from "@/hooks/useSignPlayer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Play, Square, RotateCcw, BookOpen, Sparkles } from "lucide-react";
import { KNOWN_WORDS } from "@/lib/signEngine";

const SUGGESTIONS = [
  "Salom",
  "Rahmat",
  "Men sevaman",
  "Bugun yaxshi",
  "Ona uy",
  "Sen qanday",
];

const Studio = () => {
  const [text, setText] = useState("Salom");
  const [showDict, setShowDict] = useState(false);
  const player = useSignPlayer();

  const handlePlay = () => {
    if (player.isPlaying) {
      player.stop();
    } else {
      player.play(text);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-soft text-primary-deep text-xs font-medium mb-2">
            <Sparkles className="h-3 w-3" /> Studio
          </div>
          <h1 className="text-3xl md:text-4xl font-display font-bold">Matn → Imo-ishora</h1>
          <p className="text-muted-foreground mt-2">
            Matn yozing — 3D avatar uni surdo (imo-ishora) tilida ko'rsatadi.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Avatar */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card rounded-3xl overflow-hidden relative aspect-square lg:aspect-auto lg:min-h-[600px]"
          >
            <SignAvatar pose={player.currentPose} showControls />

            {/* Overlay */}
            <div className="absolute top-4 left-4 right-4 flex justify-between items-start pointer-events-none">
              <div className="glass px-3 py-1.5 rounded-full text-xs font-medium">
                {player.isPlaying ? (
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
                    Tarjima qilinyapti
                  </span>
                ) : (
                  <span className="text-muted-foreground">Tayyor</span>
                )}
              </div>
              {player.currentWord && (
                <div className="glass px-3 py-1.5 rounded-full text-xs font-medium">
                  "{player.currentWord}"
                </div>
              )}
            </div>

            {/* Progress */}
            {player.isPlaying && (
              <div className="absolute bottom-4 left-4 right-4 h-1.5 bg-white/40 rounded-full overflow-hidden">
                <motion.div
                  className="h-full gradient-hero"
                  animate={{ width: `${player.progress * 100}%` }}
                  transition={{ duration: 0.2 }}
                />
              </div>
            )}
          </motion.div>

          {/* Controls */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-4"
          >
            <div className="glass-card rounded-3xl p-6 space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Tarjima qilinadigan matn</label>
                <Textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Bu yerga matn yozing..."
                  rows={4}
                  className="resize-none rounded-2xl"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Belgilar: {text.length}
                </p>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-2">
                  <label className="font-medium">Tezlik</label>
                  <span className="text-muted-foreground">{player.speed.toFixed(1)}x</span>
                </div>
                <Slider
                  value={[player.speed]}
                  onValueChange={(v) => player.setSpeed(v[0])}
                  min={0.5}
                  max={2}
                  step={0.1}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handlePlay}
                  variant={player.isPlaying ? "destructive" : "hero"}
                  size="lg"
                  className="flex-1"
                  disabled={!text.trim()}
                >
                  {player.isPlaying ? (
                    <><Square className="h-4 w-4" /> To'xtatish</>
                  ) : (
                    <><Play className="h-4 w-4" /> Tarjima qilish</>
                  )}
                </Button>
                <Button
                  onClick={() => setText("")}
                  variant="outline"
                  size="lg"
                  disabled={!text}
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Suggestions */}
            <div className="glass-card rounded-3xl p-6 space-y-3">
              <h3 className="font-display font-semibold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" /> Tezkor namunalar
              </h3>
              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => setText(s)}
                    className="px-3 py-1.5 rounded-full bg-primary-soft hover:bg-primary hover:text-primary-foreground text-sm transition-smooth"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Dictionary */}
            <div className="glass-card rounded-3xl p-6">
              <button
                onClick={() => setShowDict(!showDict)}
                className="w-full flex items-center justify-between"
              >
                <span className="font-display font-semibold flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-primary" />
                  Bilingan so'zlar lug'ati
                </span>
                <span className="text-xs text-muted-foreground">
                  {KNOWN_WORDS.length} ta so'z {showDict ? "▴" : "▾"}
                </span>
              </button>
              {showDict && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {KNOWN_WORDS.map((w) => (
                    <span key={w} className="px-2.5 py-1 rounded-full bg-muted text-xs">
                      {w}
                    </span>
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-3">
                💡 Lug'atda yo'q so'zlar harflab (fingerspelling) ko'rsatiladi.
                Real surdo dataset qo'shilishi bilan lug'at kengayadi.
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Studio;
