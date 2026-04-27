/**
 * MediaPipe Hand Landmark utilities
 *
 * MediaPipe Hands / Holistic returns 21 landmarks per hand:
 *  0 WRIST
 *  1-4   THUMB_CMC, THUMB_MCP, THUMB_IP, THUMB_TIP
 *  5-8   INDEX_FINGER_MCP, INDEX_FINGER_PIP, INDEX_FINGER_DIP, INDEX_FINGER_TIP
 *  9-12  MIDDLE_FINGER_MCP, MIDDLE_FINGER_PIP, MIDDLE_FINGER_DIP, MIDDLE_FINGER_TIP
 * 13-16  RING_FINGER_MCP, RING_FINGER_PIP, RING_FINGER_DIP, RING_FINGER_TIP
 * 17-20  PINKY_MCP, PINKY_PIP, PINKY_DIP, PINKY_TIP
 */

export interface Point3 {
  x: number;
  y: number;
  z: number;
}

// ── Normalize ──────────────────────────────────────────────

export function normalizeHandLandmarks(raw: Point3[]): Point3[] {
  if (raw.length < 21) return raw;
  const wrist = raw[0];
  const shifted = raw.map((p) => ({
    x: p.x - wrist.x,
    y: p.y - wrist.y,
    z: p.z - wrist.z,
  }));
  const tip = shifted[12]; // middle finger tip
  const scale = Math.sqrt(tip.x * tip.x + tip.y * tip.y + tip.z * tip.z) || 1;
  return shifted.map((p) => ({
    x: p.x / scale,
    y: p.y / scale,
    z: p.z / scale,
  }));
}

// ── Angle helpers ──────────────────────────────────────────

function angleBetween(a: Point3, b: Point3, c: Point3): number {
  const ba = { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
  const bc = { x: c.x - b.x, y: c.y - b.y, z: c.z - b.z };
  const dot = ba.x * bc.x + ba.y * bc.y + ba.z * bc.z;
  const magBA = Math.sqrt(ba.x ** 2 + ba.y ** 2 + ba.z ** 2) || 1e-6;
  const magBC = Math.sqrt(bc.x ** 2 + bc.y ** 2 + bc.z ** 2) || 1e-6;
  const cos = Math.max(-1, Math.min(1, dot / (magBA * magBC)));
  return Math.acos(cos) * (180 / Math.PI);
}

export interface FingerAngles {
  thumb: [number, number];
  index: [number, number];
  middle: [number, number];
  ring: [number, number];
  pinky: [number, number];
}

const FINGER_JOINTS: [number, number, number, number][] = [
  [1, 2, 3, 4],    // thumb: CMC MCP IP TIP
  [5, 6, 7, 8],    // index
  [9, 10, 11, 12], // middle
  [13, 14, 15, 16],// ring
  [17, 18, 19, 20],// pinky
];

export function calculateFingerAngles(landmarks: Point3[]): FingerAngles {
  const result: [number, number][] = [];
  for (const [mcp, pip, dip, tip] of FINGER_JOINTS) {
    const a1 = angleBetween(landmarks[mcp], landmarks[pip], landmarks[dip]);
    const a2 = angleBetween(landmarks[pip], landmarks[dip], landmarks[tip]);
    result.push([a1, a2]);
  }
  return {
    thumb: result[0],
    index: result[1],
    middle: result[2],
    ring: result[3],
    pinky: result[4],
  };
}

// ── Shape classifier ───────────────────────────────────────

function isCurled(angles: [number, number], thresh = 120): boolean {
  return angles[0] > thresh && angles[1] > thresh;
}

function isExtended(angles: [number, number], thresh = 50): boolean {
  return angles[0] < thresh && angles[1] < thresh;
}

function isHalfCurled(angles: [number, number]): boolean {
  const avg = (angles[0] + angles[1]) / 2;
  return avg > 50 && avg < 120;
}

export type HandShapeLabel =
  | "fist" | "open" | "point" | "peace" | "thumb" | "L"
  | "C" | "Y" | "ok" | "flat" | "pinch" | "rock" | "claw" | "unknown";

export function classifyHandShape(landmarks: Point3[]): { shape: HandShapeLabel; confidence: number } {
  if (landmarks.length < 21) return { shape: "unknown", confidence: 0 };

  const norm = normalizeHandLandmarks(landmarks);
  const angles = calculateFingerAngles(norm);

  const thumbExt = isExtended(angles.thumb, 60);
  const thumbCurl = isCurled(angles.thumb, 100);
  const indexExt = isExtended(angles.index);
  const indexCurl = isCurled(angles.index);
  const middleExt = isExtended(angles.middle);
  const middleCurl = isCurled(angles.middle);
  const ringExt = isExtended(angles.ring);
  const ringCurl = isCurled(angles.ring);
  const pinkyExt = isExtended(angles.pinky);
  const pinkyCurl = isCurled(angles.pinky);

  const allCurl = indexCurl && middleCurl && ringCurl && pinkyCurl;
  const allExt = indexExt && middleExt && ringExt && pinkyExt;

  const indexHalf = isHalfCurled(angles.index);
  const middleHalf = isHalfCurled(angles.middle);
  const ringHalf = isHalfCurled(angles.ring);
  const pinkyHalf = isHalfCurled(angles.pinky);
  const allHalf = indexHalf && middleHalf && ringHalf && pinkyHalf;

  // Thumb-index tip distance for ok/pinch
  const thumbTip = norm[4];
  const indexTip = norm[8];
  const tipDist = Math.sqrt(
    (thumbTip.x - indexTip.x) ** 2 +
    (thumbTip.y - indexTip.y) ** 2 +
    (thumbTip.z - indexTip.z) ** 2,
  );
  const tipsClose = tipDist < 0.3;

  type Candidate = { shape: HandShapeLabel; score: number };
  const candidates: Candidate[] = [];

  // fist
  if (allCurl && thumbCurl) candidates.push({ shape: "fist", score: 0.9 });
  else if (allCurl) candidates.push({ shape: "fist", score: 0.7 });

  // open
  if (allExt && thumbExt) candidates.push({ shape: "open", score: 0.95 });
  else if (allExt) candidates.push({ shape: "open", score: 0.75 });

  // flat (open but palm facing down — approximate by checking z spread is small)
  if (allExt && !thumbExt) candidates.push({ shape: "flat", score: 0.65 });

  // point
  if (indexExt && middleCurl && ringCurl && pinkyCurl) {
    candidates.push({ shape: "point", score: 0.9 });
  }

  // peace
  if (indexExt && middleExt && ringCurl && pinkyCurl) {
    candidates.push({ shape: "peace", score: 0.9 });
  }

  // rock (index + pinky extended, middle + ring curled)
  if (indexExt && pinkyExt && middleCurl && ringCurl) {
    candidates.push({ shape: "rock", score: 0.85 });
  }

  // thumbUp
  if (thumbExt && allCurl) candidates.push({ shape: "thumb", score: 0.9 });

  // L (thumb extended sideways + index up)
  if (thumbExt && indexExt && middleCurl && ringCurl && pinkyCurl) {
    candidates.push({ shape: "L", score: 0.85 });
  }

  // Y (thumb + pinky extended, rest curled)
  if (thumbExt && pinkyCurl === false && pinkyExt && indexCurl && middleCurl && ringCurl) {
    candidates.push({ shape: "Y", score: 0.85 });
  }

  // C (all half-curled, forming a C shape)
  if (allHalf && !thumbCurl) candidates.push({ shape: "C", score: 0.7 });

  // ok (thumb-index tips touching, rest extended)
  if (tipsClose && middleExt && ringExt && pinkyExt) {
    candidates.push({ shape: "ok", score: 0.85 });
  }

  // pinch (thumb-index tips touching, rest half-curled or curled)
  if (tipsClose && !middleExt) {
    candidates.push({ shape: "pinch", score: 0.8 });
  }

  // claw (all half-curled)
  if (allHalf && isHalfCurled(angles.thumb)) {
    candidates.push({ shape: "claw", score: 0.7 });
  }

  if (candidates.length === 0) return { shape: "unknown", confidence: 0 };
  candidates.sort((a, b) => b.score - a.score);
  return { shape: candidates[0].shape, confidence: candidates[0].score };
}

// ── Frame voting buffer ────────────────────────────────────

export class FrameVoteBuffer {
  private buffer: string[] = [];
  private readonly size: number;

  constructor(size = 10) {
    this.size = size;
  }

  push(label: string) {
    this.buffer.push(label);
    if (this.buffer.length > this.size) this.buffer.shift();
  }

  vote(): { label: string; confidence: number } | null {
    if (this.buffer.length < 3) return null;
    const counts: Record<string, number> = {};
    for (const l of this.buffer) {
      counts[l] = (counts[l] || 0) + 1;
    }
    let best = "";
    let bestCount = 0;
    for (const [label, count] of Object.entries(counts)) {
      if (count > bestCount) {
        best = label;
        bestCount = count;
      }
    }
    if (best === "unknown" || bestCount < 3) return null;
    return { label: best, confidence: bestCount / this.buffer.length };
  }

  clear() {
    this.buffer = [];
  }
}

// ── Hand position relative to body ─────────────────────────

export type HandPosition = "above_head" | "face_level" | "chest_level" | "waist_level" | "down";

export function getHandPosition(
  handWrist: Point3,
  poseLandmarks: Point3[],
): HandPosition {
  if (!poseLandmarks || poseLandmarks.length < 25) return "down";
  const nose = poseLandmarks[0];
  const lShoulder = poseLandmarks[11];
  const rShoulder = poseLandmarks[12];
  const lHip = poseLandmarks[23];
  const rHip = poseLandmarks[24];

  const shoulderY = (lShoulder.y + rShoulder.y) / 2;
  const hipY = (lHip.y + rHip.y) / 2;
  const wy = handWrist.y;

  if (wy < nose.y - 0.1) return "above_head";
  if (wy < shoulderY) return "face_level";
  if (wy < (shoulderY + hipY) / 2) return "chest_level";
  if (wy < hipY) return "waist_level";
  return "down";
}

// ── Sign detection (gesture → word) ────────────────────────

export interface SignDetection {
  sign: string;
  confidence: number;
}

export function detectSignFromLandmarks(
  rightHand: Point3[] | null,
  leftHand: Point3[] | null,
  poseLandmarks: Point3[] | null,
  rightVoter: FrameVoteBuffer,
  leftVoter: FrameVoteBuffer,
): SignDetection | null {
  if (!poseLandmarks) return null;

  const rClass = rightHand ? classifyHandShape(rightHand) : null;
  const lClass = leftHand ? classifyHandShape(leftHand) : null;

  if (rClass) rightVoter.push(rClass.shape);
  else rightVoter.push("unknown");
  if (lClass) leftVoter.push(lClass.shape);
  else leftVoter.push("unknown");

  const rVote = rightVoter.vote();
  const lVote = leftVoter.vote();

  const rShape = rVote?.label ?? "unknown";
  const lShape = lVote?.label ?? "unknown";
  const rPos = rightHand ? getHandPosition(rightHand[0], poseLandmarks) : "down";
  const lPos = leftHand ? getHandPosition(leftHand[0], poseLandmarks) : "down";
  const rConf = rVote?.confidence ?? 0;
  const lConf = lVote?.confidence ?? 0;

  // Two-hand gestures
  if (rShape === "open" && lShape === "open" && rPos === "face_level" && lPos === "face_level") {
    return { sign: "Salom", confidence: Math.min(rConf, lConf) };
  }
  if (rShape === "open" && lShape === "open" && rPos === "above_head" && lPos === "above_head") {
    return { sign: "Salom", confidence: Math.min(rConf, lConf) };
  }
  if (rShape === "flat" && lShape === "flat" && rPos !== "down" && lPos !== "down") {
    return { sign: "Rahmat", confidence: Math.min(rConf, lConf) };
  }
  if (rShape === "fist" && lShape === "fist" && rPos === "chest_level" && lPos === "chest_level") {
    return { sign: "Sevaman", confidence: Math.min(rConf, lConf) };
  }

  // Single-hand gestures (right hand priority)
  if (rShape !== "unknown" && rPos !== "down") {
    // Open hand raised high = salom
    if (rShape === "open" && (rPos === "above_head" || rPos === "face_level") && lShape === "unknown") {
      return { sign: "Salom", confidence: rConf };
    }
    if (rShape === "thumb" && rPos !== "down") {
      return { sign: "Yaxshi", confidence: rConf };
    }
    if (rShape === "point" && rPos === "chest_level") {
      return { sign: "Men", confidence: rConf };
    }
    if (rShape === "point" && (rPos === "face_level" || rPos === "above_head")) {
      return { sign: "Sen", confidence: rConf };
    }
    if (rShape === "peace") {
      return { sign: "Tinchlik", confidence: rConf };
    }
    if (rShape === "fist" && (rPos === "face_level" || rPos === "chest_level")) {
      return { sign: "Ha", confidence: rConf };
    }
    if (rShape === "L") {
      return { sign: "L-harf", confidence: rConf };
    }
    if (rShape === "Y") {
      return { sign: "Y-harf", confidence: rConf };
    }
    if (rShape === "C") {
      return { sign: "C-harf", confidence: rConf };
    }
    if (rShape === "ok") {
      return { sign: "OK", confidence: rConf };
    }
    if (rShape === "rock") {
      return { sign: "Rock", confidence: rConf };
    }
    if (rShape === "claw" && rPos === "face_level") {
      return { sign: "Qanday", confidence: rConf };
    }
    if (rShape === "flat" && rPos === "face_level") {
      return { sign: "Rahmat", confidence: rConf };
    }
    if (rShape === "open" && rPos === "waist_level") {
      return { sign: "Besh", confidence: rConf };
    }
    if (rShape === "pinch") {
      return { sign: "Kichik", confidence: rConf };
    }
  }

  return null;
}
