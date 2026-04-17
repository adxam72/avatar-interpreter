import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { SignAvatar } from "@/components/SignAvatar";
import { useSignPlayer } from "@/hooks/useSignPlayer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Play, Youtube, Hand, Sparkles } from "lucide-react";

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
  const [videos, setVideos] = useState<VideoItem[]>(DEMO_VIDEOS);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<VideoItem | null>(null);
  const [translating, setTranslating] = useState(false);
  const [transcript, setTranscript] = useState<string[]>([]);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const player = useSignPlayer();
  const idxRef = useRef(0);

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

    const tick = async () => {
      if (idxRef.current >= SAMPLE_TRANSCRIPT.length) {
        idxRef.current = 0;
      }
      const phrase = SAMPLE_TRANSCRIPT[idxRef.current];
      setTranscript((prev) => [phrase, ...prev].slice(0, 8));
      await player.play(phrase);
      idxRef.current++;
    };

    tick();
    const interval = setInterval(tick, 5000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [translating, active]);

  const stopTranslation = () => {
    setTranslating(false);
    player.stop();
    setTranscript([]);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-soft text-primary-deep text-xs font-medium mb-2">
            <Youtube className="h-3 w-3" /> ZehnTube
          </div>
          <h1 className="text-3xl md:text-4xl font-display font-bold">YouTube + Surdo tarjimon</h1>
          <p className="text-muted-foreground mt-2">
            YouTube videolar yonida 3D avatar imo-ishorada tarjima qiladi.
          </p>
        </motion.div>

        {/* Search */}
        <form onSubmit={handleSearch} className="flex gap-2 mb-6 max-w-2xl">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Video qidiring..."
              className="pl-11 rounded-full h-12"
            />
          </div>
          <Button type="submit" variant="hero" size="lg">Qidirish</Button>
        </form>

        {!active ? (
          /* Video grid */
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {videos.map((v) => (
              <motion.button
                key={v.id}
                whileHover={{ y: -4 }}
                onClick={() => { setActive(v); setTranslating(false); setTranscript([]); }}
                className="text-left glass-card rounded-3xl overflow-hidden group transition-smooth hover:shadow-elegant"
              >
                <div className="aspect-video relative overflow-hidden bg-muted">
                  <img src={v.thumbnail} alt={v.title} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-smooth flex items-center justify-center">
                    <div className="p-4 rounded-full bg-white/95 shadow-elegant">
                      <Play className="h-6 w-6 text-primary ml-0.5" fill="currentColor" />
                    </div>
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-medium line-clamp-2">{v.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{v.channel}</p>
                </div>
              </motion.button>
            ))}
          </div>
        ) : (
          /* Player view */
          <div className="grid lg:grid-cols-[1fr_380px] gap-6">
            <div>
              <button
                onClick={() => { setActive(null); stopTranslation(); }}
                className="text-sm text-muted-foreground hover:text-foreground mb-3 inline-flex items-center gap-1"
              >
                ← Orqaga
              </button>

              <div className="aspect-video rounded-3xl overflow-hidden bg-black shadow-elegant">
                <iframe
                  src={`https://www.youtube.com/embed/${active.id}?autoplay=1`}
                  className="w-full h-full"
                  allow="autoplay; encrypted-media"
                  allowFullScreen
                  title={active.title}
                />
              </div>

              <div className="mt-4">
                <h2 className="text-xl font-display font-semibold">{active.title}</h2>
                <p className="text-sm text-muted-foreground">{active.channel}</p>
              </div>

              <div className="mt-4 grid sm:grid-cols-2 gap-2">
                {videos.filter((v) => v.id !== active.id).slice(0, 4).map((v) => (
                  <button
                    key={v.id}
                    onClick={() => { setActive(v); stopTranslation(); }}
                    className="flex gap-3 p-2 rounded-2xl hover:bg-muted/50 text-left transition-smooth"
                  >
                    <img src={v.thumbnail} alt={v.title} className="w-24 aspect-video object-cover rounded-xl" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium line-clamp-2">{v.title}</div>
                      <div className="text-xs text-muted-foreground">{v.channel}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Avatar panel */}
            <div className="space-y-4">
              <div className="glass-card rounded-3xl overflow-hidden aspect-square sticky top-20">
                <SignAvatar pose={player.currentPose} />
                <div className="absolute top-3 left-3 right-3 flex justify-between">
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
                size="lg"
                className="w-full"
              >
                <Hand className="h-4 w-4" />
                {translating ? "Tarjimani to'xtatish" : "Surdo tarjimani yoqish"}
              </Button>

              {translating && (
                <div className="glass-card rounded-3xl p-4">
                  <div className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                    <Sparkles className="h-3 w-3" /> Jonli transkript
                  </div>
                  <div ref={transcriptRef} className="space-y-1.5 max-h-60 overflow-auto">
                    {transcript.map((t, i) => (
                      <motion.div
                        key={`${t}-${i}`}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: i === 0 ? 1 : 0.5 - i * 0.05 }}
                        className={`text-sm px-3 py-1.5 rounded-xl ${i === 0 ? "bg-primary-soft font-medium" : "bg-muted/30"}`}
                      >
                        {t}
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              <div className="text-xs text-muted-foreground p-3">
                💡 MVP'da demo transkript ishlatiladi. Real video subtitlari YouTube
                Captions API orqali keyinchalik ulanadi.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ZehnTube;
