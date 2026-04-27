/**
 * Sign Language Engine — Text → Sign mapping va animatsiya boshqarish
 * 
 * MVP'da: alphabet fingerspelling + asosiy o'zbek so'zlari uchun pose ma'lumotlari.
 * Kelajakda: real surdo dataset bilan o'rgatilgan model qo'shiladi.
 */

export type HandPose = {
  leftArm: { shoulder: number; elbow: number; wrist: number; rotation: number };
  rightArm: { shoulder: number; elbow: number; wrist: number; rotation: number };
  leftHand: HandShape;
  rightHand: HandShape;
  duration: number; // ms
  face?: string;
  head?: { x: number; y: number; z: number };
  spine?: { x: number; y: number; z: number };
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
      face: "smile",
    },
    {
      leftArm: { shoulder: 0, elbow: 0, wrist: 0, rotation: 0 },
      rightArm: { shoulder: 1.4, elbow: 1.3, wrist: -0.3, rotation: -0.5 },
      leftHand: "open",
      rightHand: "open",
      duration: 600,
      face: "smile",
    },
  ],
  rahmat: [
    {
      leftArm: { shoulder: 0, elbow: 0, wrist: 0, rotation: 0 },
      rightArm: { shoulder: 0.8, elbow: 1.8, wrist: 0, rotation: 0 },
      leftHand: "open",
      rightHand: "flat",
      duration: 500,
      face: "smile",
      head: { x: 0.1, y: 0, z: 0 },
    },
    {
      leftArm: { shoulder: 0, elbow: 0, wrist: 0, rotation: 0 },
      rightArm: { shoulder: 1.1, elbow: 1.2, wrist: 0.5, rotation: 0 },
      leftHand: "open",
      rightHand: "flat",
      duration: 700,
      face: "smile",
      head: { x: 0.15, y: 0, z: 0 },
    },
  ],
  ha: [
    {
      leftArm: { shoulder: 0, elbow: 0, wrist: 0, rotation: 0 },
      rightArm: { shoulder: 0.5, elbow: 1.5, wrist: 0, rotation: 0 },
      leftHand: "open",
      rightHand: "fist",
      duration: 400,
      face: "smile",
      head: { x: 0.15, y: 0, z: 0 },
    },
    {
      leftArm: { shoulder: 0, elbow: 0, wrist: 0, rotation: 0 },
      rightArm: { shoulder: 0.5, elbow: 1.7, wrist: 0, rotation: 0 },
      leftHand: "open",
      rightHand: "fist",
      duration: 400,
      face: "smile",
      head: { x: 0.1, y: 0, z: 0 },
    },
  ],
  yoq: [
    {
      leftArm: { shoulder: 0, elbow: 0, wrist: 0, rotation: 0 },
      rightArm: { shoulder: 0.7, elbow: 1.5, wrist: 0, rotation: 0.5 },
      leftHand: "open",
      rightHand: "point",
      duration: 400,
      face: "sad",
      head: { x: 0, y: -0.15, z: 0 },
    },
    {
      leftArm: { shoulder: 0, elbow: 0, wrist: 0, rotation: 0 },
      rightArm: { shoulder: 0.7, elbow: 1.5, wrist: 0, rotation: -0.5 },
      leftHand: "open",
      rightHand: "point",
      duration: 400,
      face: "sad",
      head: { x: 0, y: 0.15, z: 0 },
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
      face: "smile",
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
      face: "question",
    },
    {
      leftArm: { shoulder: 0.8, elbow: 1.3, wrist: 0.2, rotation: 0 },
      rightArm: { shoulder: 0.8, elbow: 1.3, wrist: -0.2, rotation: 0 },
      leftHand: "claw",
      rightHand: "claw",
      duration: 500,
      face: "question",
    },
  ],
  // ─── Kengaytirilgan lug'at ───
  kun: [
    { leftArm: { shoulder: 0, elbow: 0, wrist: 0, rotation: 0 },
      rightArm: { shoulder: 1.4, elbow: 0.3, wrist: 0, rotation: 0 },
      leftHand: "open", rightHand: "C", duration: 700 },
  ],
  tun: [
    { leftArm: { shoulder: 0.6, elbow: 1.5, wrist: 0, rotation: 0 },
      rightArm: { shoulder: 0.6, elbow: 1.5, wrist: 0, rotation: 0 },
      leftHand: "flat", rightHand: "flat", duration: 700 },
  ],
  bola: [
    { leftArm: { shoulder: 0, elbow: 0, wrist: 0, rotation: 0 },
      rightArm: { shoulder: 0.5, elbow: 1.2, wrist: -0.3, rotation: 0 },
      leftHand: "open", rightHand: "flat", duration: 600 },
  ],
  suv: [
    { leftArm: { shoulder: 0, elbow: 0, wrist: 0, rotation: 0 },
      rightArm: { shoulder: 0.7, elbow: 1.6, wrist: 0, rotation: 0 },
      leftHand: "open", rightHand: "peace", duration: 500 },
    { leftArm: { shoulder: 0, elbow: 0, wrist: 0, rotation: 0 },
      rightArm: { shoulder: 0.9, elbow: 1.4, wrist: 0, rotation: 0 },
      leftHand: "open", rightHand: "peace", duration: 500 },
  ],
  non: [
    { leftArm: { shoulder: 0.6, elbow: 1.4, wrist: 0, rotation: 0 },
      rightArm: { shoulder: 0.6, elbow: 1.6, wrist: 0, rotation: 0 },
      leftHand: "flat", rightHand: "flat", duration: 700 },
  ],
  maktab: [
    { leftArm: { shoulder: 0.5, elbow: 1.5, wrist: 0, rotation: 0 },
      rightArm: { shoulder: 0.5, elbow: 1.7, wrist: 0, rotation: 0 },
      leftHand: "flat", rightHand: "flat", duration: 500 },
    { leftArm: { shoulder: 0.5, elbow: 1.5, wrist: 0, rotation: 0 },
      rightArm: { shoulder: 0.5, elbow: 1.5, wrist: 0, rotation: 0 },
      leftHand: "flat", rightHand: "flat", duration: 500 },
  ],
  kitob: [
    { leftArm: { shoulder: 0.5, elbow: 1.5, wrist: 0, rotation: 0 },
      rightArm: { shoulder: 0.5, elbow: 1.5, wrist: 0, rotation: 0 },
      leftHand: "flat", rightHand: "flat", duration: 600 },
    { leftArm: { shoulder: 0.5, elbow: 1.5, wrist: 0.4, rotation: 0 },
      rightArm: { shoulder: 0.5, elbow: 1.5, wrist: -0.4, rotation: 0 },
      leftHand: "flat", rightHand: "flat", duration: 600 },
  ],
  dost: [
    { leftArm: { shoulder: 0.5, elbow: 1.6, wrist: 0, rotation: 0 },
      rightArm: { shoulder: 0.5, elbow: 1.6, wrist: 0, rotation: 0 },
      leftHand: "point", rightHand: "point", duration: 700 },
  ],
  ish: [
    { leftArm: { shoulder: 0.5, elbow: 1.5, wrist: 0, rotation: 0 },
      rightArm: { shoulder: 0.5, elbow: 1.5, wrist: 0, rotation: 0 },
      leftHand: "fist", rightHand: "fist", duration: 400 },
    { leftArm: { shoulder: 0.5, elbow: 1.6, wrist: 0, rotation: 0 },
      rightArm: { shoulder: 0.5, elbow: 1.4, wrist: 0, rotation: 0 },
      leftHand: "fist", rightHand: "fist", duration: 400 },
  ],
  vaqt: [
    { leftArm: { shoulder: 0, elbow: 0, wrist: 0, rotation: 0 },
      rightArm: { shoulder: 0.5, elbow: 1.7, wrist: 0, rotation: 0 },
      leftHand: "flat", rightHand: "point", duration: 700 },
  ],
  ovqat: [
    { leftArm: { shoulder: 0, elbow: 0, wrist: 0, rotation: 0 },
      rightArm: { shoulder: 0.6, elbow: 2, wrist: 0, rotation: 0 },
      leftHand: "open", rightHand: "pinch", duration: 500 },
    { leftArm: { shoulder: 0, elbow: 0, wrist: 0, rotation: 0 },
      rightArm: { shoulder: 0.5, elbow: 2.2, wrist: 0, rotation: 0 },
      leftHand: "open", rightHand: "pinch", duration: 500 },
  ],
  ichmoq: [
    { leftArm: { shoulder: 0, elbow: 0, wrist: 0, rotation: 0 },
      rightArm: { shoulder: 0.5, elbow: 2.1, wrist: 0, rotation: 0.3 },
      leftHand: "open", rightHand: "C", duration: 700 },
  ],
  uxlamoq: [
    { leftArm: { shoulder: 0, elbow: 0, wrist: 0, rotation: 0 },
      rightArm: { shoulder: 0.4, elbow: 2.3, wrist: 0, rotation: 0 },
      leftHand: "open", rightHand: "flat", duration: 800 },
  ],
  yurmoq: [
    { leftArm: { shoulder: 0.4, elbow: 1.5, wrist: 0, rotation: 0 },
      rightArm: { shoulder: 0.4, elbow: 1.5, wrist: 0, rotation: 0 },
      leftHand: "point", rightHand: "point", duration: 400 },
    { leftArm: { shoulder: 0.5, elbow: 1.4, wrist: 0, rotation: 0 },
      rightArm: { shoulder: 0.3, elbow: 1.6, wrist: 0, rotation: 0 },
      leftHand: "point", rightHand: "point", duration: 400 },
  ],
  kelmoq: [
    { leftArm: { shoulder: 0, elbow: 0, wrist: 0, rotation: 0 },
      rightArm: { shoulder: 1.2, elbow: 1, wrist: 0, rotation: 0 },
      leftHand: "open", rightHand: "open", duration: 500 },
    { leftArm: { shoulder: 0, elbow: 0, wrist: 0, rotation: 0 },
      rightArm: { shoulder: 0.5, elbow: 1.8, wrist: 0, rotation: 0 },
      leftHand: "open", rightHand: "claw", duration: 500 },
  ],
  ketmoq: [
    { leftArm: { shoulder: 0, elbow: 0, wrist: 0, rotation: 0 },
      rightArm: { shoulder: 0.5, elbow: 1.8, wrist: 0, rotation: 0 },
      leftHand: "open", rightHand: "open", duration: 500 },
    { leftArm: { shoulder: 0, elbow: 0, wrist: 0, rotation: 0 },
      rightArm: { shoulder: 1.3, elbow: 0.8, wrist: 0, rotation: 0.5 },
      leftHand: "open", rightHand: "flat", duration: 500 },
  ],
  ko_rmoq: [
    { leftArm: { shoulder: 0, elbow: 0, wrist: 0, rotation: 0 },
      rightArm: { shoulder: 0.5, elbow: 2, wrist: 0, rotation: 0 },
      leftHand: "open", rightHand: "peace", duration: 700 },
  ],
  eshitmoq: [
    { leftArm: { shoulder: 0, elbow: 0, wrist: 0, rotation: 0 },
      rightArm: { shoulder: 0.3, elbow: 2.4, wrist: 0, rotation: 0 },
      leftHand: "open", rightHand: "C", duration: 700 },
  ],
  gapirmoq: [
    { leftArm: { shoulder: 0, elbow: 0, wrist: 0, rotation: 0 },
      rightArm: { shoulder: 0.4, elbow: 2.3, wrist: 0, rotation: 0 },
      leftHand: "open", rightHand: "claw", duration: 400 },
    { leftArm: { shoulder: 0, elbow: 0, wrist: 0, rotation: 0 },
      rightArm: { shoulder: 0.5, elbow: 2.1, wrist: 0, rotation: 0 },
      leftHand: "open", rightHand: "open", duration: 400 },
  ],
  yaxshimisiz: [
    { leftArm: { shoulder: 0.6, elbow: 1.5, wrist: 0, rotation: 0 },
      rightArm: { shoulder: 0.6, elbow: 1.5, wrist: 0, rotation: 0 },
      leftHand: "claw", rightHand: "claw", duration: 500 },
    { leftArm: { shoulder: 0, elbow: 0, wrist: 0, rotation: 0 },
      rightArm: { shoulder: 0.8, elbow: 1.6, wrist: 0, rotation: 0 },
      leftHand: "open", rightHand: "thumb", duration: 600 },
  ],
  xayr: [
    { leftArm: { shoulder: 0, elbow: 0, wrist: 0, rotation: 0 },
      rightArm: { shoulder: 1.4, elbow: 0.5, wrist: 0.3, rotation: 0 },
      leftHand: "open", rightHand: "open", duration: 500 },
    { leftArm: { shoulder: 0, elbow: 0, wrist: 0, rotation: 0 },
      rightArm: { shoulder: 1.4, elbow: 0.5, wrist: -0.3, rotation: 0 },
      leftHand: "open", rightHand: "open", duration: 500 },
  ],
  iltimos: [
    { leftArm: { shoulder: 0, elbow: 0, wrist: 0, rotation: 0 },
      rightArm: { shoulder: 0.5, elbow: 1.7, wrist: 0, rotation: 0 },
      leftHand: "open", rightHand: "flat", duration: 400 },
    { leftArm: { shoulder: 0, elbow: 0, wrist: 0, rotation: 0 },
      rightArm: { shoulder: 0.7, elbow: 1.5, wrist: 0.3, rotation: 0 },
      leftHand: "open", rightHand: "flat", duration: 600 },
  ],
  kechirim: [
    { leftArm: { shoulder: 0.5, elbow: 1.5, wrist: 0, rotation: 0 },
      rightArm: { shoulder: 0.5, elbow: 1.5, wrist: 0, rotation: 0 },
      leftHand: "fist", rightHand: "fist", duration: 700 },
  ],
  yordam: [
    { leftArm: { shoulder: 0.5, elbow: 1.4, wrist: 0, rotation: 0 },
      rightArm: { shoulder: 0.5, elbow: 1.6, wrist: 0, rotation: 0 },
      leftHand: "fist", rightHand: "flat", duration: 700 },
  ],
  katta: [
    { leftArm: { shoulder: 0.6, elbow: 1.3, wrist: 0, rotation: 0 },
      rightArm: { shoulder: 0.6, elbow: 1.3, wrist: 0, rotation: 0 },
      leftHand: "C", rightHand: "C", duration: 400 },
    { leftArm: { shoulder: 0.9, elbow: 0.8, wrist: 0, rotation: 0.3 },
      rightArm: { shoulder: 0.9, elbow: 0.8, wrist: 0, rotation: -0.3 },
      leftHand: "C", rightHand: "C", duration: 600 },
  ],
  kichik: [
    { leftArm: { shoulder: 0.5, elbow: 1.6, wrist: 0, rotation: 0 },
      rightArm: { shoulder: 0.5, elbow: 1.6, wrist: 0, rotation: 0 },
      leftHand: "pinch", rightHand: "pinch", duration: 700 },
  ],
  issiq: [
    { leftArm: { shoulder: 0, elbow: 0, wrist: 0, rotation: 0 },
      rightArm: { shoulder: 0.5, elbow: 1.6, wrist: 0, rotation: 0 },
      leftHand: "open", rightHand: "claw", duration: 700 },
  ],
  sovuq: [
    { leftArm: { shoulder: 0.6, elbow: 1.5, wrist: 0, rotation: 0 },
      rightArm: { shoulder: 0.6, elbow: 1.5, wrist: 0, rotation: 0 },
      leftHand: "fist", rightHand: "fist", duration: 700 },
  ],
  bir: [
    { leftArm: { shoulder: 0, elbow: 0, wrist: 0, rotation: 0 },
      rightArm: { shoulder: 0.5, elbow: 1.8, wrist: 0, rotation: 0 },
      leftHand: "open", rightHand: "point", duration: 500 },
  ],
  ikki: [
    { leftArm: { shoulder: 0, elbow: 0, wrist: 0, rotation: 0 },
      rightArm: { shoulder: 0.5, elbow: 1.8, wrist: 0, rotation: 0 },
      leftHand: "open", rightHand: "peace", duration: 500 },
  ],
  uch: [
    { leftArm: { shoulder: 0, elbow: 0, wrist: 0, rotation: 0 },
      rightArm: { shoulder: 0.5, elbow: 1.8, wrist: 0, rotation: 0 },
      leftHand: "open", rightHand: "rock", duration: 500 },
  ],
  besh: [
    { leftArm: { shoulder: 0, elbow: 0, wrist: 0, rotation: 0 },
      rightArm: { shoulder: 0.5, elbow: 1.8, wrist: 0, rotation: 0 },
      leftHand: "open", rightHand: "open", duration: 500 },
  ],
};

// Bir nechta yozilish variantlarini lug'at kalitiga moslash
const WORD_ALIASES: Record<string, string> = {
  "do'st": "dost",
  "ko'rmoq": "ko_rmoq",
  "yo'q": "yoq",
  "yaxshimisiz?": "yaxshimisiz",
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
    const key = WORD_ALIASES[word] ?? word;
    const dictPoses = WORD_DICTIONARY[key];
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
