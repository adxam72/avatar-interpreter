import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { SignAvatar } from "@/components/SignAvatar";
import { useSignPlayer } from "@/hooks/useSignPlayer";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Play, Square, RotateCcw, Hand,
  Camera, CameraOff, ArrowLeftRight, AlertCircle, Repeat, X,
} from "lucide-react";
import { KNOWN_WORDS } from "@/lib/signEngine";
import { FrameVoteBuffer, detectSignFromLandmarks } from "@/lib/handLandmarkUtils";

declare global {
  interface Window {
    Holistic: any;
    Camera: any;
    drawConnectors: any;
    drawLandmarks: any;
    POSE_CONNECTIONS: any;
    HAND_CONNECTIONS: any;
    FACEMESH_TESSELATION: any;
  }
}

const SUGGESTIONS = ["Salom", "Rahmat", "Men sevaman", "Bugun yaxshi", "Ona uy"];

interface DetectedSign { text: string; confidence: number; timestamp: number; }

const CATEGORIES: Record<string, string[]> = {
  "Salomlashish": ["salom", "xayr", "rahmat", "kechirim", "iltimos", "marhamat", "yaxshimisiz"],
  "Oila": ["ona", "ota", "aka", "uka", "opa", "singil", "bola"],
  "Kundalik": ["ha", "yoq", "men", "sen", "bu", "yaxshi", "yomon"],
  "Ta'lim": ["maktab", "kitob", "dost", "ish"],
};

function categorizeWords(words: string[]) {
  const categorized = new Set<string>();
  const result: Record<string, string[]> = {};
  for (const [cat, list] of Object.entries(CATEGORIES)) {
    result[cat] = list.filter((w) => words.includes(w));
    list.forEach((w) => categorized.add(w));
  }
  const other = words.filter((w) => !categorized.has(w));
  if (other.length) result["Boshqa"] = other;
  return result;
}

const WORD_CATEGORIES = categorizeWords(KNOWN_WORDS);

const Dialog = () => {
  const { profile } = useAuth();

  const [text, setText] = useState("Salom");
  const [autoLoop, setAutoLoop] = useState(false);
  const player = useSignPlayer();

  const handlePlay = () => {
    if (player.isPlaying) player.stop();
    else player.play(text);
  };

  const lastLoopedRef = useRef<number>(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const holisticRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const lastDetectionRef = useRef<{ sign: string; time: number }>({ sign: "", time: 0 });
  const rightVoterRef = useRef(new FrameVoteBuffer(10));
  const leftVoterRef = useRef(new FrameVoteBuffer(10));

  const [camActive, setCamActive] = useState(false);
  const [camLoading, setCamLoading] = useState(false);
  const [camError, setCamError] = useState<string | null>(null);
  const [stats, setStats] = useState({ pose: 0, leftHand: 0, rightHand: 0, face: 0 });
  const [detected, setDetected] = useState<DetectedSign[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [showCamSheet, setShowCamSheet] = useState(false);

  useEffect(() => {
    if (!autoLoop) return;
    const latest = detected[0];
    if (!latest || latest.timestamp === lastLoopedRef.current) return;
    lastLoopedRef.current = latest.timestamp;
    const cleaned = latest.text.replace(/[^\p{L}\s]/gu, "").trim();
    if (cleaned) {
      setText(cleaned);
      if (player.isPlaying) player.stop();
      setTimeout(() => player.play(cleaned), 100);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoLoop, detected]);

  const detectSign = (results: any): { sign: string; confidence: number } | null => {
    return detectSignFromLandmarks(
      results.rightHandLandmarks ?? null,
      results.leftHandLandmarks ?? null,
      results.poseLandmarks ?? null,
      rightVoterRef.current,
      leftVoterRef.current,
    );
  };

  const onResultsRef = useRef<(results: any) => void>(() => {});
  const onResults = (results: any) => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.scale(-1, 1);
    ctx.translate(-canvas.width, 0);
    ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

    if (results.poseLandmarks) {
      window.drawConnectors(ctx, results.poseLandmarks, window.POSE_CONNECTIONS, {
        color: "#3b82f6", lineWidth: 3,
      });
      window.drawLandmarks(ctx, results.poseLandmarks, { color: "#1e40af", radius: 3 });
    }
    if (results.faceLandmarks) {
      window.drawConnectors(ctx, results.faceLandmarks, window.FACEMESH_TESSELATION, {
        color: "#60a5fa40", lineWidth: 0.5,
      });
    }
    if (results.leftHandLandmarks) {
      window.drawConnectors(ctx, results.leftHandLandmarks, window.HAND_CONNECTIONS,
        { color: "#1e40af", lineWidth: 3 });
      window.drawLandmarks(ctx, results.leftHandLandmarks, { color: "#3b82f6", radius: 3 });
    }
    if (results.rightHandLandmarks) {
      window.drawConnectors(ctx, results.rightHandLandmarks, window.HAND_CONNECTIONS,
        { color: "#1e40af", lineWidth: 3 });
      window.drawLandmarks(ctx, results.rightHandLandmarks, { color: "#3b82f6", radius: 3 });
    }
    ctx.restore();

    setStats({
      pose: results.poseLandmarks?.length || 0,
      leftHand: results.leftHandLandmarks?.length || 0,
      rightHand: results.rightHandLandmarks?.length || 0,
      face: results.faceLandmarks?.length || 0,
    });

    const result = detectSign(results);
    if (result) {
      const now = Date.now();
      if (result.sign !== lastDetectionRef.current.sign || now - lastDetectionRef.current.time > 1500) {
        lastDetectionRef.current = { sign: result.sign, time: now };
        setDetected((prev) => [
          { text: result.sign, confidence: result.confidence, timestamp: now },
          ...prev,
        ].slice(0, 8));
      }
    }
  };
  onResultsRef.current = onResults;

  const loadScript = (src: string) =>
    new Promise<void>((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) return resolve();
      const s = document.createElement("script");
      s.src = src;
      s.crossOrigin = "anonymous";
      s.onload = () => resolve();
      s.onerror = () => reject(new Error(`Yuklab bo'lmadi: ${src}`));
      document.head.appendChild(s);
    });

  const startCam = async () => {
    setCamLoading(true);
    setCamError(null);
    try {
      await loadScript("https://cdn.jsdelivr.net/npm/@mediapipe/holistic/holistic.js");
      await loadScript("https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js");
      await loadScript("https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js");

      const holistic = new window.Holistic({
        locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/holistic/${file}`,
      });
      holistic.setOptions({
        modelComplexity: 1,
        smoothLandmarks: true,
        enableSegmentation: false,
        refineFaceLandmarks: false,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });
      holistic.onResults((r: any) => onResultsRef.current(r));
      holisticRef.current = holistic;

      if (!videoRef.current) throw new Error("Video element yo'q");

      const camera = new window.Camera(videoRef.current, {
        onFrame: async () => {
          if (videoRef.current && holisticRef.current) {
            await holisticRef.current.send({ image: videoRef.current });
          }
        },
        width: 640,
        height: 480,
      });
      await camera.start();
      cameraRef.current = camera;
      setCamActive(true);
    } catch (e: any) {
      console.error(e);
      setCamError(e.message || "Kamera xatosi");
    } finally {
      setCamLoading(false);
    }
  };

  const stopCam = () => {
    cameraRef.current?.stop();
    holisticRef.current?.close();
    cameraRef.current = null;
    holisticRef.current = null;
    setCamActive(false);
    setStats({ pose: 0, leftHand: 0, rightHand: 0, face: 0 });
    rightVoterRef.current.clear();
    leftVoterRef.current.clear();
  };

  useEffect(() => () => stopCam(), []);

  const total = stats.pose + stats.leftHand + stats.rightHand + stats.face;

  const cameraContent = (
    <div className="flex flex-col h-full min-h-0">
      <div className="rounded-2xl overflow-hidden flex-1 min-h-0 relative bg-black">
        <video ref={videoRef} className="hidden" playsInline />
        <canvas ref={canvasRef} className="w-full h-full object-cover" />

        {!camActive && (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary-soft to-background">
            <div className="text-center space-y-3 p-6">
              <div className="inline-flex p-4 rounded-full gradient-hero text-white shadow-glow">
                <Camera className="h-6 w-6" />
              </div>
              <h3 className="font-display font-semibold text-sm">Kamerani yoqing</h3>
              <p className="text-xs text-muted-foreground max-w-[200px]">
                Imo-ishora ko'rsating — AI matnga aylantiradi
              </p>
              {camError && (
                <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 px-3 py-1.5 rounded-xl">
                  <AlertCircle className="h-3 w-3" />
                  {camError}
                </div>
              )}
            </div>
          </div>
        )}

        {camActive && (
          <div className="absolute top-2 left-2 glass px-2.5 py-1 rounded-full text-xs font-medium">
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
              {total}/543
            </span>
          </div>
        )}

        {detected[0] && camActive && (
          <motion.div
            key={detected[0].timestamp}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute bottom-2 left-2 right-2 glass rounded-xl p-2.5 text-center"
          >
            <p className="font-display font-bold text-base">{detected[0].text}</p>
            <div className="mt-1 h-1 rounded-full bg-white/20 overflow-hidden">
              <motion.div
                className="h-full gradient-hero"
                initial={{ width: 0 }}
                animate={{ width: `${Math.round(detected[0].confidence * 100)}%` }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {Math.round(detected[0].confidence * 100)}% ishonch
            </p>
          </motion.div>
        )}
      </div>

      <div className="flex gap-2 mt-2 shrink-0">
        {!camActive ? (
          <Button onClick={startCam} variant="hero" disabled={camLoading} className="flex-1" size="sm">
            <Camera className="h-4 w-4" />
            {camLoading ? "Yuklanmoqda…" : "Kamerani yoqish"}
          </Button>
        ) : (
          <Button onClick={stopCam} variant="destructive" className="flex-1" size="sm">
            <CameraOff className="h-4 w-4" /> To'xtatish
          </Button>
        )}
      </div>

      {detected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2 shrink-0">
          {detected.slice(0, 5).map((d, i) => (
            <button
              key={d.timestamp}
              onClick={() => setText(d.text.replace(/[^\p{L}\s]/gu, "").trim())}
              className={`px-2 py-0.5 rounded-full text-xs font-medium transition-smooth ${
                i === 0
                  ? "bg-primary text-primary-foreground"
                  : "bg-primary-soft text-primary-deep hover:bg-primary hover:text-primary-foreground"
              }`}
            >
              {d.text} {Math.round(d.confidence * 100)}%
            </button>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between mt-2 p-2 rounded-xl bg-primary-soft/40 shrink-0">
        <div className="flex items-center gap-1.5">
          <Repeat className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-medium">Avto-takror</span>
        </div>
        <Switch checked={autoLoop} onCheckedChange={setAutoLoop} />
      </div>
    </div>
  );

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      <Navbar />

      <div className="container flex-1 flex flex-col overflow-hidden py-3">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-3 flex items-center gap-3 shrink-0"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-soft text-primary-deep text-xs font-medium">
            <ArrowLeftRight className="h-3 w-3" /> Dialog rejimi
          </div>
          <h1 className="text-lg font-display font-bold">Ikki tomonlama muloqot</h1>
        </motion.div>

        {/* ─── DESKTOP LAYOUT ─── */}
        <div className="hidden md:grid md:grid-cols-[1fr_320px] gap-3 flex-1 min-h-0">
          {/* LEFT: Avatar (65-70%) */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex flex-col min-h-0 gap-2"
          >
            {/* Avatar display */}
            <div className="glass-card rounded-2xl overflow-hidden relative" style={{ minHeight: '500px', height: '65vh' }}>
              <SignAvatar
                pose={player.currentPose}
                avatarUrl={profile?.avatar_url || undefined}
                showControls
              />

              <div className="absolute top-3 left-3 right-3 flex justify-between items-start pointer-events-none">
                <motion.div
                  initial={false}
                  animate={{ scale: player.isPlaying ? [1, 1.05, 1] : 1 }}
                  transition={{ repeat: player.isPlaying ? Infinity : 0, duration: 1.5 }}
                  className="glass px-3 py-1.5 rounded-full text-xs font-medium"
                >
                  {player.isPlaying ? (
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
                      Ishlayapti…
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Tayyor</span>
                  )}
                </motion.div>
                {player.currentWord && (
                  <motion.div
                    key={player.currentWord}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="glass px-3 py-1.5 rounded-full text-xs font-semibold"
                  >
                    "{player.currentWord}"
                  </motion.div>
                )}
              </div>

              {player.isPlaying && (
                <div className="absolute bottom-3 left-3 right-3 h-1.5 bg-white/30 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full gradient-hero"
                    animate={{ width: `${player.progress * 100}%` }}
                    transition={{ duration: 0.2 }}
                  />
                </div>
              )}
            </div>

            {/* Controls bar */}
            <div className="backdrop-blur-sm bg-background/80 border border-border/50 rounded-2xl p-3 shrink-0 space-y-2">
              <div className="flex gap-2">
                <Textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Matn yozing — avatar imo-ishora bilan ko'rsatadi…"
                  rows={1}
                  className="resize-none rounded-xl text-sm flex-1"
                />
                <Button
                  onClick={handlePlay}
                  variant={player.isPlaying ? "destructive" : "hero"}
                  disabled={!text.trim()}
                  size="sm"
                >
                  {player.isPlaying ? <Square className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>
                <Button onClick={() => setText("")} variant="outline" disabled={!text} size="sm">
                  <RotateCcw className="h-4 w-4" />
                </Button>
                <div className="flex items-center gap-2 border-l pl-2">
                  <span className="text-xs text-muted-foreground shrink-0">{player.speed.toFixed(1)}x</span>
                  <Slider
                    value={[player.speed]}
                    onValueChange={(v) => player.setSpeed(v[0])}
                    min={0.5}
                    max={2}
                    step={0.1}
                    className="w-20"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => setText(s)}
                    className="px-2.5 py-1 rounded-full bg-primary-soft hover:bg-primary hover:text-primary-foreground text-xs font-medium transition-smooth"
                  >
                    {s}
                  </button>
                ))}
                {detected[0] && (
                  <button
                    onClick={() => setText(detected[0].text.replace(/[^\p{L}\s]/gu, "").trim())}
                    className="px-2.5 py-1 rounded-full bg-success/20 text-success text-xs font-medium transition-smooth hover:bg-success/30"
                  >
                    ↩ {detected[0].text}
                  </button>
                )}
              </div>
            </div>
          </motion.div>

          {/* RIGHT: Camera (30-35%) */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex flex-col min-h-0"
          >
            {cameraContent}
          </motion.div>
        </div>

        {/* ─── MOBILE LAYOUT ─── */}
        <div className="flex flex-col md:hidden flex-1 min-h-0 gap-2">
          {/* Avatar — 50vh */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative rounded-2xl overflow-hidden shrink-0"
            style={{ height: "50vh" }}
          >
            <SignAvatar
              pose={player.currentPose}
              avatarUrl={profile?.avatar_url || undefined}
              showControls
            />

            <div className="absolute top-2 left-2 right-2 flex justify-between items-start pointer-events-none">
              <div className="glass px-2.5 py-1 rounded-full text-xs font-medium">
                {player.isPlaying ? (
                  <span className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
                    Ishlayapti…
                  </span>
                ) : (
                  <span className="text-muted-foreground">Tayyor</span>
                )}
              </div>
              {player.currentWord && (
                <div className="glass px-2.5 py-1 rounded-full text-xs font-medium">
                  "{player.currentWord}"
                </div>
              )}
            </div>

            {player.isPlaying && (
              <div className="absolute bottom-2 left-2 right-2 h-1 bg-white/30 rounded-full overflow-hidden">
                <motion.div
                  className="h-full gradient-hero"
                  animate={{ width: `${player.progress * 100}%` }}
                  transition={{ duration: 0.2 }}
                />
              </div>
            )}
          </motion.div>

          {/* Mobile controls */}
          <div className="backdrop-blur-sm bg-background/80 border border-border/50 rounded-xl p-2.5 shrink-0 space-y-2">
            <div className="flex gap-2">
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Matn yozing…"
                rows={1}
                className="resize-none rounded-lg text-sm flex-1"
              />
              <Button
                onClick={handlePlay}
                variant={player.isPlaying ? "destructive" : "hero"}
                disabled={!text.trim()}
                size="sm"
              >
                {player.isPlaying ? <Square className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
            </div>

            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => setText(s)}
                  className="px-2.5 py-1 rounded-full bg-primary-soft hover:bg-primary hover:text-primary-foreground text-xs font-medium transition-smooth whitespace-nowrap shrink-0"
                >
                  {s}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={() => setShowCamSheet(true)}
                variant="outline"
                size="sm"
                className="flex-1"
              >
                <Camera className="h-4 w-4" />
                Kamera
                {camActive && <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse ml-1" />}
              </Button>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground">{player.speed.toFixed(1)}x</span>
                <Slider
                  value={[player.speed]}
                  onValueChange={(v) => player.setSpeed(v[0])}
                  min={0.5}
                  max={2}
                  step={0.1}
                  className="w-16"
                />
              </div>
            </div>
          </div>

          {/* Mobile camera sheet */}
          <AnimatePresence>
            {showCamSheet && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex flex-col"
              >
                <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowCamSheet(false)} />
                <motion.div
                  initial={{ y: "100%" }}
                  animate={{ y: 0 }}
                  exit={{ y: "100%" }}
                  transition={{ type: "spring", damping: 25, stiffness: 300 }}
                  className="mt-auto relative bg-background rounded-t-3xl p-4 max-h-[75vh] flex flex-col"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Camera className="h-4 w-4 text-primary" />
                      <span className="font-display font-semibold text-sm">Kamera — imo-ishora aniqlash</span>
                    </div>
                    <button onClick={() => setShowCamSheet(false)} className="p-1 rounded-full hover:bg-muted">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="flex-1 min-h-0">
                    {cameraContent}
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ─── DICTIONARY ─── */}
        <div className="mt-2 shrink-0 backdrop-blur-sm bg-background/80 border border-border/50 rounded-xl px-3 py-2">
          {/* Desktop: category pills + words */}
          <div className="hidden md:block">
            <div className="flex items-center gap-2 flex-wrap">
              <Hand className="h-3.5 w-3.5 text-primary shrink-0" />
              <span className="text-xs font-medium shrink-0">Lug'at ({KNOWN_WORDS.length})</span>
              {Object.keys(WORD_CATEGORIES).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-smooth ${
                    activeCategory === cat
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted hover:bg-muted/80"
                  }`}
                >
                  {cat} ({WORD_CATEGORIES[cat].length})
                </button>
              ))}
            </div>
            <AnimatePresence mode="wait">
              {activeCategory && WORD_CATEGORIES[activeCategory] && (
                <motion.div
                  key={activeCategory}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="flex flex-wrap gap-1.5 pt-2">
                    {WORD_CATEGORIES[activeCategory].map((w) => (
                      <button
                        key={w}
                        onClick={() => setText(w.charAt(0).toUpperCase() + w.slice(1))}
                        className="px-2 py-0.5 rounded-full bg-primary-soft hover:bg-primary hover:text-primary-foreground text-xs font-medium transition-smooth"
                      >
                        {w}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Mobile: horizontal scroll */}
          <div className="md:hidden">
            <div className="flex items-center gap-2 mb-1.5">
              <Hand className="h-3.5 w-3.5 text-primary shrink-0" />
              <span className="text-xs font-medium">Lug'at ({KNOWN_WORDS.length})</span>
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {KNOWN_WORDS.map((w) => (
                <button
                  key={w}
                  onClick={() => setText(w.charAt(0).toUpperCase() + w.slice(1))}
                  className="px-2 py-0.5 rounded-full bg-muted hover:bg-primary hover:text-primary-foreground text-xs whitespace-nowrap shrink-0 transition-smooth"
                >
                  {w}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dialog;
