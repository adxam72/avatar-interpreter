export type FingerJoints = {
  joint1: number;
  joint2: number;
  joint3: number;
};

export type HandFingerPose = {
  thumb: FingerJoints;
  index: FingerJoints;
  middle: FingerJoints;
  ring: FingerJoints;
  pinky: FingerJoints;
  wristTwist: number;
  wristBend: number;
};

const CLOSED: FingerJoints = { joint1: 1.4, joint2: 1.5, joint3: 1.2 };
const OPEN: FingerJoints = { joint1: 0, joint2: 0, joint3: 0 };
const HALF: FingerJoints = { joint1: 0.6, joint2: 0.7, joint3: 0.5 };
const SLIGHT: FingerJoints = { joint1: 0.2, joint2: 0.15, joint3: 0.1 };
const ROUND: FingerJoints = { joint1: 0.7, joint2: 0.8, joint3: 0.6 };

export const HAND_SHAPES: Record<string, HandFingerPose> = {
  fist: {
    thumb: { joint1: 0.8, joint2: 1.0, joint3: 0.6 },
    index: CLOSED, middle: CLOSED, ring: CLOSED, pinky: CLOSED,
    wristTwist: 0, wristBend: 0,
  },
  open: {
    thumb: { joint1: -0.3, joint2: 0, joint3: 0 },
    index: OPEN, middle: OPEN, ring: OPEN, pinky: OPEN,
    wristTwist: 0, wristBend: 0,
  },
  point: {
    thumb: { joint1: 0.8, joint2: 1.0, joint3: 0.6 },
    index: OPEN,
    middle: CLOSED, ring: CLOSED, pinky: CLOSED,
    wristTwist: 0, wristBend: 0,
  },
  peace: {
    thumb: { joint1: 0.8, joint2: 1.0, joint3: 0.6 },
    index: OPEN, middle: OPEN,
    ring: CLOSED, pinky: CLOSED,
    wristTwist: 0, wristBend: 0,
  },
  thumb: {
    thumb: { joint1: -0.4, joint2: -0.2, joint3: 0 },
    index: CLOSED, middle: CLOSED, ring: CLOSED, pinky: CLOSED,
    wristTwist: 0, wristBend: 0,
  },
  L: {
    thumb: { joint1: -0.5, joint2: 0, joint3: 0 },
    index: OPEN,
    middle: CLOSED, ring: CLOSED, pinky: CLOSED,
    wristTwist: 0, wristBend: 0,
  },
  C: {
    thumb: { joint1: -0.3, joint2: 0.3, joint3: 0.2 },
    index: ROUND, middle: ROUND, ring: ROUND, pinky: ROUND,
    wristTwist: 0, wristBend: 0,
  },
  Y: {
    thumb: { joint1: -0.4, joint2: -0.2, joint3: 0 },
    index: CLOSED, middle: CLOSED, ring: CLOSED,
    pinky: OPEN,
    wristTwist: 0, wristBend: 0,
  },
  ok: {
    thumb: { joint1: 0.5, joint2: 0.8, joint3: 0.6 },
    index: { joint1: 0.5, joint2: 0.9, joint3: 0.7 },
    middle: OPEN, ring: OPEN, pinky: OPEN,
    wristTwist: 0, wristBend: 0,
  },
  flat: {
    thumb: { joint1: 0.3, joint2: 0, joint3: 0 },
    index: OPEN, middle: OPEN, ring: OPEN, pinky: OPEN,
    wristTwist: 0, wristBend: -0.2,
  },
  rest: {
    thumb: { joint1: 0.1, joint2: 0.1, joint3: 0.05 },
    index: SLIGHT, middle: SLIGHT, ring: SLIGHT, pinky: SLIGHT,
    wristTwist: 0, wristBend: 0,
  },
  pinch: {
    thumb: { joint1: 0.5, joint2: 0.7, joint3: 0.5 },
    index: { joint1: 0.5, joint2: 0.8, joint3: 0.6 },
    middle: HALF, ring: HALF, pinky: HALF,
    wristTwist: 0, wristBend: 0,
  },
  rock: {
    thumb: { joint1: -0.4, joint2: -0.2, joint3: 0 },
    index: OPEN,
    middle: CLOSED, ring: CLOSED,
    pinky: OPEN,
    wristTwist: 0, wristBend: 0,
  },
  claw: {
    thumb: { joint1: -0.2, joint2: 0.3, joint3: 0.2 },
    index: HALF, middle: HALF, ring: HALF, pinky: HALF,
    wristTwist: 0, wristBend: 0.1,
  },
};

export type FacialExpression = Partial<Record<string, number>>;

export const FACE_PRESETS: Record<string, FacialExpression> = {
  neutral: {},
  smile: {
    mouthSmileLeft: 0.7,
    mouthSmileRight: 0.7,
    cheekSquintLeft: 0.3,
    cheekSquintRight: 0.3,
  },
  surprised: {
    browInnerUp: 0.8,
    browOuterUpLeft: 0.6,
    browOuterUpRight: 0.6,
    eyeWideLeft: 0.5,
    eyeWideRight: 0.5,
    jawOpen: 0.4,
    mouthFunnel: 0.3,
  },
  sad: {
    browInnerUp: 0.5,
    browDownLeft: 0.3,
    browDownRight: 0.3,
    mouthFrownLeft: 0.6,
    mouthFrownRight: 0.6,
  },
  angry: {
    browDownLeft: 0.8,
    browDownRight: 0.8,
    eyeSquintLeft: 0.4,
    eyeSquintRight: 0.4,
    mouthFrownLeft: 0.3,
    mouthFrownRight: 0.3,
    jawForward: 0.2,
  },
  thinking: {
    browInnerUp: 0.3,
    browOuterUpLeft: 0.4,
    eyeSquintRight: 0.3,
    mouthLeft: 0.3,
    mouthPressLeft: 0.2,
  },
  question: {
    browInnerUp: 0.6,
    browOuterUpLeft: 0.5,
    browOuterUpRight: 0.5,
    eyeWideLeft: 0.3,
    eyeWideRight: 0.3,
    mouthFunnel: 0.15,
  },
};
