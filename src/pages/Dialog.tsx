import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { SignAvatar } from "@/components/SignAvatar";
import { useSignPlayer } from "@/hooks/useSignPlayer";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Play, Square, RotateCcw, Sparkles, Hand,
  Camera, CameraOff, ArrowLeftRight, AlertCircle, Repeat,
} from "lucide-react";
import { KNOWN_WORDS } from "@/lib/signEngine";

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

interface DetectedSign { text: string; timestamp: number; }

const Dialog = () => {
  const { profile } = useAuth();

  // ─── Studio (text → sign) ─────────────────────────────────
  const [text, setText] = useState("Salom");
  const [autoLoop, setAutoLoop] = useState(false);
  const player = useSignPlayer();

  const handlePlay = () => {
    if (player.isPlaying) player.stop();
    else player.play(text);
  };

  // ─── Recognize (sign → text) ──────────────────────────────
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const holisticRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const lastDetectionRef = useRef<{ sign: string; time: number }>({ sign: "", time: 0 });

  const [camActive, setCamActive] = useState(false);
  const [camLoading, setCamLoading] = useState(false);
  const [camError, setCamError] = useState<string | null>(null);
  const [stats, setStats] = useState({ pose: 0, leftHand: 0, rightHand: 0, face: 0 });
  const [detected, setDetected] = useState<DetectedSign[]>([]);

  const detectSign = (results: any): string | null => {
    const rh = results.rightHandLandmarks;
    const lh = results.leftHandLandmarks;
    const pose = results.poseLandmarks;
    if (!pose) return null;

    const isExtended = (hand: any, tip: number, pip: number) =>
      hand && hand[tip].y < hand[pip].y;

    if (rh && rh[0].y < pose[12].y - 0.1) {
      const allOpen = isExtended(rh, 8, 6) && isExtended(rh, 12, 10) && isExtended(rh, 16, 14);
      if (allOpen) return "Salom 👋";
    }
    if (rh) {
      const thumbUp = rh[4].y < rh[3].y && rh[3].y < rh[2].y;
      const otherClosed = !isExtended(rh, 8, 6) && !isExtended(rh, 12, 10) && !isExtended(rh, 16, 14);
      if (thumbUp && otherClosed) return "Yaxshi 👍";
    }
    if (rh) {
      const indexOut = isExtended(rh, 8, 6);
      const restClosed = !isExtended(rh, 12, 10) && !isExtended(rh, 16, 14) && !isExtended(rh, 20, 18);
      if (indexOut && restClosed) return "Men 👈";
    }
    if (rh) {
      const peace = isExtended(rh, 8, 6) && isExtended(rh, 12, 10) &&
                    !isExtended(rh, 16, 14) && !isExtended(rh, 20, 18);
      if (peace) return "Tinchlik ✌️";
    }
    if (rh && lh && rh[0].y < pose[12].y && lh[0].y < pose[11].y) return "Rahmat 🙏";
    return null;
  };

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

    const sign = detectSign(results);
    if (sign) {
      const now = Date.now();
      if (sign !== lastDetectionRef.current.sign || now - lastDetectionRef.current.time > 2000) {
        lastDetectionRef.current = { sign, time: now };
        setDetected((prev) => [{ text: sign, timestamp: now }, ...prev].slice(0, 8));
      }
    }
  };

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
      holistic.onResults(onResults);
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
  };

  useEffect(() => () => stopCam(), []);

  const total = stats.pose + stats.leftHand + stats.rightHand + stats.face;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container py-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-soft text-primary-deep text-xs font-medium mb-2">
            <ArrowLeftRight className="h-3 w-3" /> Dialog rejimi
          </div>
          <h1 className="text-2xl md:text-3xl font-display font-bold">
            Ikki tomonlama muloqot
          </h1>
          <p className="text-muted-foreground mt-1 text-sm md:text-base">
            Chap tomon — kamera siz ishorani ko'rsatasiz. O'ng tomon — matn yozsangiz avatar ko'rsatadi.
          </p>
        </motion.div>

        {/* SPLIT VIEW */}
        <div className="grid lg:grid-cols-2 gap-4">
          {/* ────── LEFT: RECOGNIZE ────── */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-3"
          >
            <div className="glass-card rounded-3xl overflow-hidden aspect-video relative bg-black">
              <video ref={videoRef} className="hidden" playsInline />
              <canvas ref={canvasRef} className="w-full h-full object-cover" />

              {!camActive && (
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary-soft to-background">
                  <div className="text-center space-y-3 p-6">
                    <div className="inline-flex p-4 rounded-full gradient-hero text-white shadow-glow">
                      <Camera className="h-8 w-8" />
                    </div>
                    <h3 className="font-display font-semibold">Sizning navbatingiz</h3>
                    <p className="text-xs text-muted-foreground max-w-xs">
                      Kamerani yoqing va imo-ishora ko'rsating — AI matnga aylantiradi.
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
                <div className="absolute top-3 left-3 glass px-3 py-1 rounded-full text-xs font-medium">
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
                    {total}/543 nuqta
                  </span>
                </div>
              )}

              {detected[0] && camActive && (
                <motion.div
                  key={detected[0].timestamp}
                  initial={{ opacity: 0, y: 20, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className="absolute bottom-3 left-3 right-3 glass rounded-2xl p-3 text-center"
                >
                  <p className="text-xs text-muted-foreground mb-0.5">Aniqlandi</p>
                  <p className="font-display font-semibold text-lg">{detected[0].text}</p>
                </motion.div>
              )}
            </div>

            <div className="flex gap-2">
              {!camActive ? (
                <Button onClick={startCam} variant="hero" disabled={camLoading} className="flex-1">
                  <Camera className="h-4 w-4" />
                  {camLoading ? "Yuklanmoqda…" : "Kamerani yoqish"}
                </Button>
              ) : (
                <Button onClick={stopCam} variant="destructive" className="flex-1">
                  <CameraOff className="h-4 w-4" /> To'xtatish
                </Button>
              )}
            </div>

            {/* Recent detections */}
            {detected.length > 0 && (
              <div className="glass-card rounded-2xl p-4">
                <h4 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Hand className="h-3 w-3" /> Oxirgi ishoralar
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {detected.map((d) => (
                    <span
                      key={d.timestamp}
                      className="px-2.5 py-1 rounded-full bg-primary-soft text-primary-deep text-xs font-medium"
                    >
                      {d.text}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </motion.div>

          {/* ────── RIGHT: STUDIO (avatar) ────── */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-3"
          >
            <div className="glass-card rounded-3xl overflow-hidden aspect-video relative">
              <SignAvatar
                pose={player.currentPose}
                avatarUrl={profile?.avatar_url || undefined}
                showControls
                compact
              />

              <div className="absolute top-3 left-3 right-3 flex justify-between items-start pointer-events-none">
                <div className="glass px-3 py-1 rounded-full text-xs font-medium">
                  {player.isPlaying ? (
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
                      Tarjima…
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Tayyor</span>
                  )}
                </div>
                {player.currentWord && (
                  <div className="glass px-3 py-1 rounded-full text-xs font-medium">
                    "{player.currentWord}"
                  </div>
                )}
              </div>

              {player.isPlaying && (
                <div className="absolute bottom-3 left-3 right-3 h-1 bg-white/40 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full gradient-hero"
                    animate={{ width: `${player.progress * 100}%` }}
                    transition={{ duration: 0.2 }}
                  />
                </div>
              )}
            </div>

            <div className="glass-card rounded-2xl p-4 space-y-3">
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Bu yerga matn yozing — avatar uni imo-ishora bilan ko'rsatadi…"
                rows={2}
                className="resize-none rounded-2xl text-sm"
              />

              <div>
                <div className="flex justify-between text-xs mb-1.5">
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
                  className="flex-1"
                  disabled={!text.trim()}
                >
                  {player.isPlaying ? (
                    <><Square className="h-4 w-4" /> To'xtatish</>
                  ) : (
                    <><Play className="h-4 w-4" /> Ko'rsatish</>
                  )}
                </Button>
                <Button onClick={() => setText("")} variant="outline" disabled={!text}>
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-2xl bg-primary-soft/40">
                <div className="flex items-center gap-2">
                  <Repeat className="h-4 w-4 text-primary" />
                  <span className="text-xs font-medium">Avto-takror</span>
                  <span className="text-[10px] text-muted-foreground">
                    aniqlangan ishorani avatar darrov takrorlaydi
                  </span>
                </div>
                <Switch checked={autoLoop} onCheckedChange={setAutoLoop} />
              </div>

              <div className="flex flex-wrap gap-1.5 pt-1">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => setText(s)}
                    className="px-2.5 py-1 rounded-full bg-primary-soft hover:bg-primary hover:text-primary-foreground text-xs font-medium transition-smooth"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Auto-reply: detected sign → put in textarea */}
            {detected[0] && (
              <button
                onClick={() => setText(detected[0].text.replace(/[^\p{L}\s]/gu, "").trim())}
                className="w-full glass-card rounded-2xl p-3 text-left hover:bg-primary-soft/50 transition-smooth"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">💡 Aniqlangan ishorani avatar bilan qaytarish</p>
                    <p className="text-sm font-medium mt-0.5">"{detected[0].text}"</p>
                  </div>
                  <ArrowLeftRight className="h-4 w-4 text-primary" />
                </div>
              </button>
            )}
          </motion.div>
        </div>

        {/* Dictionary footer */}
        <div className="mt-6 glass-card rounded-2xl p-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Bilingan so'zlar</span>
              <span className="text-xs text-muted-foreground">({KNOWN_WORDS.length})</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {KNOWN_WORDS.map((w) => (
                <span key={w} className="px-2 py-0.5 rounded-full bg-muted text-xs">
                  {w}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dialog;
