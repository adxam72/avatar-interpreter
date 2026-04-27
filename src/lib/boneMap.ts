import * as THREE from "three";

export const BONE_NAMES = {
  // Spine chain
  Hips: "Hips",
  Spine: "Spine",
  Spine1: "Spine1",
  Spine2: "Spine2",
  Neck: "Neck",
  Head: "Head",

  // Left arm
  LeftShoulder: "LeftShoulder",
  LeftArm: "LeftArm",
  LeftForeArm: "LeftForeArm",
  LeftHand: "LeftHand",

  // Left fingers
  LeftHandThumb1: "LeftHandThumb1",
  LeftHandThumb2: "LeftHandThumb2",
  LeftHandThumb3: "LeftHandThumb3",
  LeftHandIndex1: "LeftHandIndex1",
  LeftHandIndex2: "LeftHandIndex2",
  LeftHandIndex3: "LeftHandIndex3",
  LeftHandMiddle1: "LeftHandMiddle1",
  LeftHandMiddle2: "LeftHandMiddle2",
  LeftHandMiddle3: "LeftHandMiddle3",
  LeftHandRing1: "LeftHandRing1",
  LeftHandRing2: "LeftHandRing2",
  LeftHandRing3: "LeftHandRing3",
  LeftHandPinky1: "LeftHandPinky1",
  LeftHandPinky2: "LeftHandPinky2",
  LeftHandPinky3: "LeftHandPinky3",

  // Right arm
  RightShoulder: "RightShoulder",
  RightArm: "RightArm",
  RightForeArm: "RightForeArm",
  RightHand: "RightHand",

  // Right fingers
  RightHandThumb1: "RightHandThumb1",
  RightHandThumb2: "RightHandThumb2",
  RightHandThumb3: "RightHandThumb3",
  RightHandIndex1: "RightHandIndex1",
  RightHandIndex2: "RightHandIndex2",
  RightHandIndex3: "RightHandIndex3",
  RightHandMiddle1: "RightHandMiddle1",
  RightHandMiddle2: "RightHandMiddle2",
  RightHandMiddle3: "RightHandMiddle3",
  RightHandRing1: "RightHandRing1",
  RightHandRing2: "RightHandRing2",
  RightHandRing3: "RightHandRing3",
  RightHandPinky1: "RightHandPinky1",
  RightHandPinky2: "RightHandPinky2",
  RightHandPinky3: "RightHandPinky3",
} as const;

export type BoneName = (typeof BONE_NAMES)[keyof typeof BONE_NAMES];

export type FullBoneMap = Partial<Record<BoneName, THREE.Bone>>;

export function extractBones(root: THREE.Object3D): FullBoneMap {
  const map: FullBoneMap = {};
  const nameSet = new Set<string>(Object.values(BONE_NAMES));
  root.traverse((obj) => {
    if ((obj as THREE.Bone).isBone && nameSet.has(obj.name)) {
      map[obj.name as BoneName] = obj as THREE.Bone;
    }
  });
  return map;
}

export interface MorphTargetEntry {
  mesh: THREE.Mesh;
  index: number;
}

export type MorphTargetMap = Record<string, MorphTargetEntry>;

export function extractMorphTargets(root: THREE.Object3D): MorphTargetMap {
  const result: MorphTargetMap = {};
  root.traverse((obj) => {
    if (!(obj as THREE.Mesh).isMesh) return;
    const mesh = obj as THREE.Mesh;
    const dict = mesh.morphTargetDictionary;
    if (!dict || !mesh.morphTargetInfluences) return;
    for (const [name, index] of Object.entries(dict)) {
      if (!(name in result)) {
        result[name] = { mesh, index };
      }
    }
  });
  return result;
}
