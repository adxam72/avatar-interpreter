/**
 * Sign Language Engine — Text → Sign mapping va animatsiya boshqarish
 * 
 * MVP'da: alphabet fingerspelling + asosiy o'zbek so'zlari uchun pose ma'lumotlari.
 * Kelajakda: real surdo dataset bilan o'rgatilgan model qo'shiladi.
 */

export type HandPose = {
  // Soddalashtirilgan qo'l holatlari (kelajakda 21 nuqta x,y,z bo'ladi)
  leftArm: { shoulder: number; elbow: number; wrist: number; rotation: number };
  rightArm: { shoulder: number; elbow: number; wrist: number; rotation: number };
  leftHand: HandShape;
  rightHand: HandShape;
  duration: number; // ms
};

export type HandShape =
  | "fist" | "open" | "point" | "peace" | "ok" | "thumb" | "rock"
  | "flat" | "claw" | "pinch" | "L" | "C" | "Y";

export type SignSequence = {
  word: string;
  poses: HandPose[];
};

// Asosiy holat — qo'llar pastda
const REST_POSE: HandPose = {
  leftArm: { shoulder: 0, elbow: 0, wrist: 0, rotation: 0 },
  rightArm: { shoulder: 0, elbow: 0, wrist: 0, rotation: 0 },
  leftHand: "open",
  rightHand: "open",
  duration: 400,
};

// O'zbek tilidagi asosiy so'zlar uchun ishora ketma-ketliklari
// (MVP — soddalashtirilgan demonstratsiya)
const WORD_DICTIONARY: Record<string, HandPose[]> = {
  salom: [
    {
      leftArm: { shoulder: 0, elbow: 0, wrist: 0, rotation: 0 },
      rightArm: { shoulder: 1.2, elbow: 1.5, wrist: 0.3, rotation: 0.5 },
      leftHand: "open",
      rightHand: "open",
      duration: 600,
    },
    {
      leftArm: { shoulder: 0, elbow: 0, wrist: 0, rotation: 0 },
      rightArm: { shoulder: 1.4, elbow: 1.3, wrist: -0.3, rotation: -0.5 },
      leftHand: "open",
      rightHand: "open",
      duration: 600,
    },
  ],
  rahmat: [
    {
      leftArm: { shoulder: 0, elbow: 0, wrist: 0, rotation: 0 },
      rightArm: { shoulder: 0.8, elbow: 1.8, wrist: 0, rotation: 0 },
      leftHand: "open",
      rightHand: "flat",
      duration: 500,
    },
    {
      leftArm: { shoulder: 0, elbow: 0, wrist: 0, rotation: 0 },
      rightArm: { shoulder: 1.1, elbow: 1.2, wrist: 0.5, rotation: 0 },
      leftHand: "open",
      rightHand: "flat",
      duration: 700,
    },
  ],
  ha: [
    {
      leftArm: { shoulder: 0, elbow: 0, wrist: 0, rotation: 0 },
      rightArm: { shoulder: 0.5, elbow: 1.5, wrist: 0, rotation: 0 },
      leftHand: "open",
      rightHand: "fist",
      duration: 400,
    },
    {
      leftArm: { shoulder: 0, elbow: 0, wrist: 0, rotation: 0 },
      rightArm: { shoulder: 0.5, elbow: 1.7, wrist: 0, rotation: 0 },
      leftHand: "open",
      rightHand: "fist",
      duration: 400,
    },
  ],
  yoq: [
    {
      leftArm: { shoulder: 0, elbow: 0, wrist: 0, rotation: 0 },
      rightArm: { shoulder: 0.7, elbow: 1.5, wrist: 0, rotation: 0.5 },
      leftHand: "open",
      rightHand: "point",
      duration: 400,
    },
    {
      leftArm: { shoulder: 0, elbow: 0, wrist: 0, rotation: 0 },
      rightArm: { shoulder: 0.7, elbow: 1.5, wrist: 0, rotation: -0.5 },
      leftHand: "open",
      rightHand: "point",
      duration: 400,
    },
  ],
  men: [
    {
      leftArm: { shoulder: 0, elbow: 0, wrist: 0, rotation: 0 },
      rightArm: { shoulder: 0.3, elbow: 2.2, wrist: 0, rotation: 0 },
      leftHand: "open",
      rightHand: "point",
      duration: 700,
    },
  ],
  sen: [
    {
      leftArm: { shoulder: 0, elbow: 0, wrist: 0, rotation: 0 },
      rightArm: { shoulder: 1.2, elbow: 0.5, wrist: 0, rotation: 0 },
      leftHand: "open",
      rightHand: "point",
      duration: 700,
    },
  ],
  yaxshi: [
    {
      leftArm: { shoulder: 0, elbow: 0, wrist: 0, rotation: 0 },
      rightArm: { shoulder: 0.8, elbow: 1.7, wrist: 0, rotation: 0 },
      leftHand: "open",
      rightHand: "thumb",
      duration: 800,
    },
  ],
  sevaman: [
    {
      leftArm: { shoulder: 0.6, elbow: 1.5, wrist: 0, rotation: 0 },
      rightArm: { shoulder: 0.6, elbow: 1.5, wrist: 0, rotation: 0 },
      leftHand: "fist",
      rightHand: "fist",
      duration: 600,
    },
    {
      leftArm: { shoulder: 0.6, elbow: 1.4, wrist: 0, rotation: 0 },
      rightArm: { shoulder: 0.6, elbow: 1.4, wrist: 0, rotation: 0 },
      leftHand: "open",
      rightHand: "open",
      duration: 600,
    },
  ],
  bugun: [
    {
      leftArm: { shoulder: 0.5, elbow: 1.5, wrist: 0, rotation: 0 },
      rightArm: { shoulder: 0.5, elbow: 1.5, wrist: 0, rotation: 0 },
      leftHand: "thumb",
      rightHand: "thumb",
      duration: 500,
    },
    {
      leftArm: { shoulder: 0.7, elbow: 1.3, wrist: 0, rotation: 0 },
      rightArm: { shoulder: 0.7, elbow: 1.3, wrist: 0, rotation: 0 },
      leftHand: "thumb",
      rightHand: "thumb",
      duration: 500,
    },
  ],
  uy: [
    {
      leftArm: { shoulder: 0.8, elbow: 1.4, wrist: 0.3, rotation: 0 },
      rightArm: { shoulder: 0.8, elbow: 1.4, wrist: -0.3, rotation: 0 },
      leftHand: "flat",
      rightHand: "flat",
      duration: 800,
    },
  ],
  ota: [
    {
      leftArm: { shoulder: 0, elbow: 0, wrist: 0, rotation: 0 },
      rightArm: { shoulder: 0.4, elbow: 2.5, wrist: 0, rotation: 0 },
      leftHand: "open",
      rightHand: "open",
      duration: 700,
    },
  ],
  ona: [
    {
      leftArm: { shoulder: 0, elbow: 0, wrist: 0, rotation: 0 },
      rightArm: { shoulder: 0.6, elbow: 2.2, wrist: 0, rotation: 0.3 },
      leftHand: "open",
      rightHand: "open",
      duration: 700,
    },
  ],
  qanday: [
    {
      leftArm: { shoulder: 0.6, elbow: 1.5, wrist: 0, rotation: 0 },
      rightArm: { shoulder: 0.6, elbow: 1.5, wrist: 0, rotation: 0 },
      leftHand: "claw",
      rightHand: "claw",
      duration: 500,
    },
    {
      leftArm: { shoulder: 0.8, elbow: 1.3, wrist: 0.2, rotation: 0 },
      rightArm: { shoulder: 0.8, elbow: 1.3, wrist: -0.2, rotation: 0 },
      leftHand: "claw",
      rightHand: "claw",
      duration: 500,
    },
  ],
};

// Alphabet fingerspelling (har bir harf — bitta hand shape)
const ALPHABET_HAND: Record<string, HandShape> = {
  a: "fist", b: "flat", c: "C", d: "point", e: "claw",
  f: "ok", g: "point", h: "peace", i: "Y", j: "Y",
  k: "peace", l: "L", m: "fist", n: "fist", o: "C",
  p: "point", q: "point", r: "peace", s: "fist", t: "fist",
  u: "peace", v: "peace", w: "open", x: "claw", y: "Y", z: "point",
  // O'zbek qo'shimcha harflari
  "o'": "C", "g'": "point", "ʻ": "C",
  ş: "open", ç: "claw", ñ: "fist",
};

function fingerspell(word: string): HandPose[] {
  const poses: HandPose[] = [];
  for (const ch of word.toLowerCase()) {
    const shape = ALPHABET_HAND[ch] ?? "open";
    poses.push({
      leftArm: { shoulder: 0, elbow: 0, wrist: 0, rotation: 0 },
      rightArm: { shoulder: 0.5, elbow: 1.7, wrist: 0, rotation: 0 },
      leftHand: "open",
      rightHand: shape,
      duration: 400,
    });
  }
  return poses;
}

/**
 * Matnni ishora ketma-ketligiga aylantirish
 * 1. So'zlar bo'yicha bo'linadi
 * 2. Lug'atda bo'lsa — tayyor animatsiya
 * 3. Bo'lmasa — fingerspelling
 */
export function textToSignSequence(text: string): SignSequence[] {
  const cleaned = text.toLowerCase().replace(/[.,!?;:]/g, "").trim();
  const words = cleaned.split(/\s+/).filter(Boolean);
  const sequences: SignSequence[] = [];

  for (const word of words) {
    const dictPoses = WORD_DICTIONARY[word];
    if (dictPoses) {
      sequences.push({ word, poses: [...dictPoses, REST_POSE] });
    } else {
      sequences.push({ word: `${word} (harflab)`, poses: [...fingerspell(word), REST_POSE] });
    }
  }

  return sequences;
}

export const KNOWN_WORDS = Object.keys(WORD_DICTIONARY);
export { REST_POSE };
