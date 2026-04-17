import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Camera, CameraOff, Hand, Sparkles, AlertCircle } from "lucide-react";

// MediaPipe types
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

interface DetectedSign {
  text: string;
  confidence: number;
  timestamp: number;
}

const Recognize = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const holisticRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const lastDetectionRef = useRef<{ sign: string; time: number }>({ sign: "", time: 0 });

  const [active, setActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({ pose: 0, leftHand: 0, rightHand: 0, face: 0 });
  const [detected, setDetected] = useState<DetectedSign[]>([]);

  // Demo qoidalar bilan ishora aniqlash
  const detectSign = (results: any): string | null => {
    const rh = results.rightHandLandmarks;
    const lh = results.leftHandLandmarks;
    const pose = results.poseLandmarks;

    if (!pose) return null;

    // Helper: check if finger is extended (tip y < pip y in image coords means up)
    const isExtended = (hand: any, tipIdx: number, pipIdx: number) =>
      hand && hand[tipIdx].y < hand[pipIdx].y;

    // QO'L tepada (salom) — wrist above shoulder
    if (rh && rh[0].y < pose[12].y - 0.1) {
      const allOpen = isExtended(rh, 8, 6) && isExtended(rh, 12, 10) && isExtended(rh, 16, 14);
      if (allOpen) return "Salom 👋";
    }

    // Thumb up — yaxshi (ha)
    if (rh) {
      const thumbUp = rh[4].y < rh[3].y && rh[3].y < rh[2].y;
      const otherClosed = !isExtended(rh, 8, 6) && !isExtended(rh, 12, 10) && !isExtended(rh, 16, 14);
      if (thumbUp && otherClosed) return "Yaxshi 👍";
    }

    // Index pointing — Men/Sen (qaysi tomonga)
    if (rh) {
      const indexOut = isExtended(rh, 8, 6);
      const restClosed = !isExtended(rh, 12, 10) && !isExtended(rh, 16, 14) && !isExtended(rh, 20, 18);
      if (indexOut && restClosed) {
        // Pointing to self?
        if (rh[8].x > 0.4 && rh[8].x < 0.6 && rh[8].z < -0.1) return "Men 👈";
        return "Ko'rsatilyapti";
      }
    }

    // Peace — V belgisi
    if (rh) {
      const peace = isExtended(rh, 8, 6) && isExtended(rh, 12, 10) &&
                    !isExtended(rh, 16, 14) && !isExtended(rh, 20, 18);
      if (peace) return "Tinchlik ✌️";
    }

    // Two hands raised — Rahmat (ikki qo'l ko'tarilgan)
    if (rh && lh && rh[0].y < pose[12].y && lh[0].y < pose[11].y) {
      return "Rahmat 🙏";
    }

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
    // Mirror
    ctx.scale(-1, 1);
    ctx.translate(-canvas.width, 0);
    ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

    const drawConnectors = window.drawConnectors;
    const drawLandmarks = window.drawLandmarks;

    // Pose
    if (results.poseLandmarks) {
      drawConnectors(ctx, results.poseLandmarks, window.POSE_CONNECTIONS, {
        color: "#3b82f6", lineWidth: 3,
      });
      drawLandmarks(ctx, results.poseLandmarks, { color: "#1e40af", lineWidth: 1, radius: 3 });
    }
    // Face
    if (results.faceLandmarks) {
      drawConnectors(ctx, results.faceLandmarks, window.FACEMESH_TESSELATION, {
        color: "#60a5fa40", lineWidth: 0.5,
      });
    }
    // Hands
    if (results.leftHandLandmarks) {
      drawConnectors(ctx, results.leftHandLandmarks, window.HAND_CONNECTIONS, {
        color: "#1e40af", lineWidth: 3,
      });
      drawLandmarks(ctx, results.leftHandLandmarks, { color: "#3b82f6", lineWidth: 1, radius: 3 });
    }
    if (results.rightHandLandmarks) {
      drawConnectors(ctx, results.rightHandLandmarks, window.HAND_CONNECTIONS, {
        color: "#1e40af", lineWidth: 3,
      });
      drawLandmarks(ctx, results.rightHandLandmarks, { color: "#3b82f6", lineWidth: 1, radius: 3 });
    }
    ctx.restore();

    setStats({
      pose: results.poseLandmarks?.length || 0,
      leftHand: results.leftHandLandmarks?.length || 0,
      rightHand: results.rightHandLandmarks?.length || 0,
      face: results.faceLandmarks?.length || 0,
    });

    // Detection (with debounce)
    const sign = detectSign(results);
    if (sign) {
      const now = Date.now();
      if (sign !== lastDetectionRef.current.sign || now - lastDetectionRef.current.time > 2000) {
        lastDetectionRef.current = { sign, time: now };
        setDetected((prev) => [{ text: sign, confidence: 0.85, timestamp: now }, ...prev].slice(0, 10));
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
      s.onerror = () => reject(new Error(`Failed to load ${src}`));
      document.head.appendChild(s);
    });

  const start = async () => {
    setLoading(true);
    setError(null);
    try {
      // Load MediaPipe scripts from CDN
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
      setActive(true);
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Kamerani yoqishda xatolik. Ruxsat berdingizmi?");
    } finally {
      setLoading(false);
    }
  };

  const stop = () => {
    cameraRef.current?.stop();
    holisticRef.current?.close();
    cameraRef.current = null;
    holisticRef.current = null;
    setActive(false);
    setStats({ pose: 0, leftHand: 0, rightHand: 0, face: 0 });
  };

  useEffect(() => () => stop(), []);

  const total = stats.pose + stats.leftHand + stats.rightHand + stats.face;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-soft text-primary-deep text-xs font-medium mb-2">
            <Hand className="h-3 w-3" /> Aniqlash
          </div>
          <h1 className="text-3xl md:text-4xl font-display font-bold">Imo-ishora → Matn</h1>
          <p className="text-muted-foreground mt-2">
            Kamera oldida ishora qiling — AI 543 ta nuqtani aniqlab, matnga aylantiradi.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Camera */}
          <div className="lg:col-span-2">
            <div className="glass-card rounded-3xl overflow-hidden aspect-video relative bg-black">
              <video ref={videoRef} className="hidden" playsInline />
              <canvas
                ref={canvasRef}
                className="w-full h-full object-cover"
                style={{ transform: active ? "none" : undefined }}
              />
              {!active && (
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary-soft to-background">
                  <div className="text-center space-y-4 p-8">
                    <div className="inline-flex p-6 rounded-full gradient-hero text-white shadow-glow">
                      <Camera className="h-12 w-12" />
                    </div>
                    <h3 className="text-xl font-display font-semibold">Kamerani yoqing</h3>
                    <p className="text-muted-foreground max-w-sm">
                      MediaPipe Holistic 543 ta nuqtangizni aniqlab, ishoralarni o'qiydi.
                    </p>
                    {error && (
                      <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 px-4 py-2 rounded-xl">
                        <AlertCircle className="h-4 w-4" />
                        {error}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {active && total > 0 && (
                <div className="absolute top-4 left-4 glass px-3 py-1.5 rounded-full text-xs font-medium">
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
                    {total} nuqta aniqlandi
                  </span>
                </div>
              )}
            </div>

            <div className="mt-4 flex gap-2">
              {!active ? (
                <Button onClick={start} variant="hero" size="lg" disabled={loading} className="flex-1">
                  <Camera className="h-4 w-4" />
                  {loading ? "Yuklanmoqda..." : "Kamerani yoqish"}
                </Button>
              ) : (
                <Button onClick={stop} variant="destructive" size="lg" className="flex-1">
                  <CameraOff className="h-4 w-4" /> To'xtatish
                </Button>
              )}
            </div>
          </div>

          {/* Stats + Detected */}
          <div className="space-y-4">
            <div className="glass-card rounded-3xl p-6 space-y-3">
              <h3 className="font-display font-semibold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" /> 543 nuqta jonli
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">🧍 Tana</span>
                  <span className="font-mono font-medium">{stats.pose}/33</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">✋ Chap qo'l</span>
                  <span className="font-mono font-medium">{stats.leftHand}/21</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">✋ O'ng qo'l</span>
                  <span className="font-mono font-medium">{stats.rightHand}/21</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">🙂 Yuz</span>
                  <span className="font-mono font-medium">{stats.face}/468</span>
                </div>
                <div className="border-t pt-2 flex justify-between font-medium">
                  <span>Jami</span>
                  <span className="font-mono gradient-text">{total}/543</span>
                </div>
              </div>
            </div>

            <div className="glass-card rounded-3xl p-6">
              <h3 className="font-display font-semibold mb-3">Aniqlangan ishoralar</h3>
              {detected.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Hali ishora aniqlanmadi. Kamera oldida 👋 (qo'l silkitish), 👍 (yaxshi), ☝️ (men), ✌️ ishorlarini sinab ko'ring.
                </p>
              ) : (
                <div className="space-y-2 max-h-80 overflow-auto">
                  {detected.map((d, i) => (
                    <motion.div
                      key={d.timestamp}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`p-3 rounded-2xl border ${i === 0 ? "bg-primary-soft border-primary/20" : "bg-muted/50 border-transparent"}`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{d.text}</span>
                        <span className="text-xs text-muted-foreground">
                          {Math.round(d.confidence * 100)}%
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-4 pt-3 border-t">
                💡 MVP'da ~6 ta demo ishora aniqlanadi. Sizning surdo dataset bilan keyinchalik
                TensorFlow.js model qo'shilib, jumlalar aniqlanadi.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Recognize;
