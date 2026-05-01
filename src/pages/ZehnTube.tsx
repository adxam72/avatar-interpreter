import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { SignAvatar } from "@/components/SignAvatar";
import { useSignPlayer } from "@/hooks/useSignPlayer";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Play, Youtube, Hand, Maximize2, Minimize2 } from "lucide-react";

interface VideoItem {
  id: string;
  title: string;
  channel: string;
  thumbnail: string;
}

// Demo videolar (YouTube Data API kerak emas — IFrame search bilan ishlaymiz)
const DEMO_VIDEOS: VideoItem[] = [
  { id: "dQw4w9WgXcQ", title: "Salom dunyo — Hello world", channel: "Zehn AI demo", thumbnail: "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg" },
  { id: "jNQXAC9IVRw", title: "Birinchi YouTube videosi", channel: "jawed", thumbnail: "https://i.ytimg.com/vi/jNQXAC9IVRw/hqdefault.jpg" },
  { id: "9bZkp7q19f0", title: "Gangnam Style", channel: "PSY", thumbnail: "https://i.ytimg.com/vi/9bZkp7q19f0/hqdefault.jpg" },
  { id: "kJQP7kiw5Fk", title: "Despacito", channel: "Luis Fonsi", thumbnail: "https://i.ytimg.com/vi/kJQP7kiw5Fk/hqdefault.jpg" },
  { id: "RgKAFK5djSk", title: "Wiz Khalifa — See You Again", channel: "Wiz Khalifa", thumbnail: "https://i.ytimg.com/vi/RgKAFK5djSk/hqdefault.jpg" },
  { id: "JGwWNGJdvx8", title: "Ed Sheeran — Shape of You", channel: "Ed Sheeran", thumbnail: "https://i.ytimg.com/vi/JGwWNGJdvx8/hqdefault.jpg" },
];

const SAMPLE_TRANSCRIPT = [
  "Salom",
  "Bugun yaxshi kun",
  "Men sevaman",
  "Rahmat",
  "Sen qanday",
  "Ona uy",
];

const ZehnTube = () => {
  const { profile } = useAuth();
  const [videos, setVideos] = useState<VideoItem[]>(DEMO_VIDEOS);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<VideoItem | null>(null);
  const [translating, setTranslating] = useState(false);
  const [transcript, setTranscript] = useState<string[]>([]);
  const [expanded, setExpanded] = useState(false);
  const theaterRef = useRef<HTMLDivElement>(null);
  const player = useSignPlayer();
  const idxRef = useRef(0);

  const toggleExpand = () => {
    if (!theaterRef.current) return;
    if (!document.fullscreenElement) {
      theaterRef.current.requestFullscreen().then(() => setExpanded(true));
    } else {
      document.exitFullscreen().then(() => setExpanded(false));
    }
  };

  useEffect(() => {
    const onFs = () => { if (!document.fullscreenElement) setExpanded(false); };
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Demo: filter title with query
    if (!query.trim()) {
      setVideos(DEMO_VIDEOS);
      return;
    }
    const filtered = DEMO_VIDEOS.filter((v) =>
      v.title.toLowerCase().includes(query.toLowerCase()) ||
      v.channel.toLowerCase().includes(query.toLowerCase())
    );
    setVideos(filtered.length ? filtered : DEMO_VIDEOS);
  };

  // Simulate live transcript translation while video plays
  useEffect(() => {
    if (!translating || !active) return;
    idxRef.current = 0;
    setTranscript([]);

    let cancelled = false;
    const loop = async () => {
      while (!cancelled) {
        if (idxRef.current >= SAMPLE_TRANSCRIPT.length) {
          idxRef.current = 0;
        }
        const phrase = SAMPLE_TRANSCRIPT[idxRef.current];
        setTranscript((prev) => [phrase, ...prev].slice(0, 8));
        await player.play(phrase);
        idxRef.current++;
        if (!cancelled) await new Promise((r) => setTimeout(r, 1500));
      }
    };
    loop();
    return () => { cancelled = true; player.stop(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [translating, active]);

  const stopTranslation = () => {
    setTranslating(false);
    player.stop();
    setTranscript([]);
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      <Navbar />

      <div className="container flex-1 flex flex-col overflow-hidden py-3">
        {/* Header + Search */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-3 flex items-center gap-3 flex-wrap shrink-0">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-soft text-primary-deep text-xs font-medium shrink-0">
            <Youtube className="h-3 w-3" /> ZehnTube
          </div>
          {active && (
            <button
              onClick={() => { setActive(null); stopTranslation(); }}
              className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
            >
              ← Orqaga
            </button>
          )}
          <form onSubmit={handleSearch} className="flex gap-2 flex-1 min-w-[200px] max-w-md ml-auto">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Video qidiring..."
                className="pl-9 rounded-full h-9 text-sm"
              />
            </div>
            <Button type="submit" variant="hero" size="sm">Qidirish</Button>
          </form>
        </motion.div>

        {!active ? (
          /* Video grid */
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 flex-1 min-h-0 overflow-auto">
            {videos.map((v) => (
              <motion.button
                key={v.id}
                whileHover={{ y: -4 }}
                onClick={() => { setActive(v); setTranslating(true); setTranscript([]); }}
                className="text-left glass-card rounded-2xl overflow-hidden group transition-smooth hover:shadow-elegant h-fit"
              >
                <div className="aspect-video relative overflow-hidden bg-muted">
                  <img src={v.thumbnail} alt={v.title} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-smooth flex items-center justify-center">
                    <div className="p-3 rounded-full bg-white/95 shadow-elegant">
                      <Play className="h-5 w-5 text-primary ml-0.5" fill="currentColor" />
                    </div>
                  </div>
                </div>
                <div className="p-3">
                  <h3 className="font-medium text-sm line-clamp-1">{v.title}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{v.channel}</p>
                </div>
              </motion.button>
            ))}
          </div>
        ) : (
          /* Player view */
          <div ref={theaterRef} className={`flex-1 min-h-0 ${expanded ? "bg-black flex flex-col" : "grid lg:grid-cols-[1fr_320px] gap-3"}`}>
            {/* Video side */}
            <div className="flex flex-col min-h-0 flex-1">
              <div className={`overflow-hidden bg-black shadow-elegant flex-1 min-h-0 relative ${expanded ? "" : "rounded-2xl"}`}>
                <iframe
                  src={`https://www.youtube.com/embed/${active.id}?autoplay=1`}
                  className="w-full h-full"
                  allow="autoplay; encrypted-media"
                  title={active.title}
                />
                <button
                  onClick={toggleExpand}
                  className="absolute top-3 right-3 z-10 glass px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 hover:bg-white/90 transition-smooth shadow-lg"
                >
                  {expanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
                  {expanded ? "Kichraytirish" : "Kengaytirish"}
                </button>
              </div>

              {!expanded && (
                <div className="mt-2 flex items-start gap-3 shrink-0">
                  <div className="flex-1 min-w-0">
                    <h2 className="text-sm font-display font-semibold truncate">{active.title}</h2>
                    <p className="text-xs text-muted-foreground">{active.channel}</p>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    {videos.filter((v) => v.id !== active.id).slice(0, 3).map((v) => (
                      <button
                        key={v.id}
                        onClick={() => { setActive(v); setTranslating(true); setTranscript([]); }}
                        className="rounded-lg overflow-hidden hover:ring-2 ring-primary transition-smooth"
                      >
                        <img src={v.thumbnail} alt={v.title} className="w-16 aspect-video object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Avatar panel — sidebar normally, overlay in fullscreen */}
            <div className={expanded
              ? "absolute bottom-4 right-4 w-72 h-80 flex flex-col gap-2 z-50"
              : "flex flex-col gap-2 min-h-0"
            }>
              <div className={`rounded-2xl overflow-hidden flex-1 min-h-0 relative ${expanded ? "glass shadow-2xl border border-white/20" : "glass-card"}`}>
                <SignAvatar pose={player.currentPose} avatarUrl={profile?.avatar_url || undefined} compact />
                <div className="absolute top-2 left-2 right-2 flex justify-between">
                  <div className="glass px-2.5 py-1 rounded-full text-xs font-medium">
                    {translating ? (
                      <span className="flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
                        JONLI
                      </span>
                    ) : (
                      "Tarjimon"
                    )}
                  </div>
                  {player.currentWord && (
                    <div className="glass px-2.5 py-1 rounded-full text-xs font-medium max-w-[60%] truncate">
                      {player.currentWord}
                    </div>
                  )}
                </div>
              </div>

              <Button
                onClick={() => translating ? stopTranslation() : setTranslating(true)}
                variant={translating ? "destructive" : "hero"}
                size="sm"
                className="w-full shrink-0"
              >
                <Hand className="h-4 w-4" />
                {translating ? "To'xtatish" : "Surdo tarjima"}
              </Button>

              {translating && !expanded && (
                <div className="glass-card rounded-xl p-2.5 shrink-0">
                  <div className="flex flex-wrap gap-1.5">
                    {transcript.slice(0, 4).map((t, i) => (
                      <span
                        key={`${t}-${i}`}
                        className={`text-xs px-2 py-0.5 rounded-full ${i === 0 ? "bg-primary-soft font-medium" : "bg-muted/30 opacity-60"}`}
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ZehnTube;
