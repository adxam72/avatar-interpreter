import { Component, ReactNode, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, useGLTF, Html } from "@react-three/drei";
import * as THREE from "three";
import { HandPose, REST_POSE } from "@/lib/signEngine";
import { extractBones, extractMorphTargets, FullBoneMap, MorphTargetMap } from "@/lib/boneMap";
import { HAND_SHAPES, type HandFingerPose, FACE_PRESETS, type FacialExpression } from "@/lib/handShapes";

const DEFAULT_AVATAR_URL = "/Remy_final.glb";

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

const _qa = new THREE.Quaternion();
const _qb = new THREE.Quaternion();
const _euler = new THREE.Euler();

function slerpBone(bone: THREE.Bone, ex: number, ey: number, ez: number, t: number) {
  _qa.copy(bone.quaternion);
  _euler.set(ex, ey, ez);
  _qb.setFromEuler(_euler);
  _qa.slerp(_qb, t);
  bone.quaternion.copy(_qa);
}

const FINGER_NAMES = ["Thumb", "Index", "Middle", "Ring", "Pinky"] as const;
type FingerField = "thumb" | "index" | "middle" | "ring" | "pinky";
const FINGER_KEYS: Record<typeof FINGER_NAMES[number], FingerField> = {
  Thumb: "thumb",
  Index: "index",
  Middle: "middle",
  Ring: "ring",
  Pinky: "pinky",
};

function applyFingers(
  bones: FullBoneMap,
  side: "Left" | "Right",
  shape: HandFingerPose,
  current: Record<string, number>,
  t: number,
) {
  for (const finger of FINGER_NAMES) {
    const joints = shape[FINGER_KEYS[finger]];
    for (let j = 1; j <= 3; j++) {
      const boneName = `${side}Hand${finger}${j}` as keyof typeof bones;
      const bone = bones[boneName];
      if (!bone) continue;
      const key = `${side}${finger}${j}`;
      const target = j === 1 ? joints.joint1 : j === 2 ? joints.joint2 : joints.joint3;
      current[key] = lerp(current[key] ?? 0, target, t);
      const val = current[key];
      if (finger === "Thumb") {
        bone.rotation.z = val * (side === "Left" ? 1 : -1);
      } else {
        bone.rotation.z = val * (side === "Left" ? 1 : -1) * 0.3;
        bone.rotation.x = val * 0.6;
      }
    }
  }
}

function applyMorphTargets(
  morphMap: MorphTargetMap,
  expression: FacialExpression,
  current: Record<string, number>,
  t: number,
) {
  const active = new Set(Object.keys(expression));
  for (const name of Object.keys(current)) {
    if (!active.has(name)) {
      active.add(name);
    }
  }
  for (const name of active) {
    const entry = morphMap[name];
    if (!entry) continue;
    const target = expression[name] ?? 0;
    current[name] = lerp(current[name] ?? 0, target, t);
    entry.mesh.morphTargetInfluences![entry.index] = current[name];
  }
}

// Clipping plane — beldan pastini kesadi (world space da Y=-0.15 dan past)
// beldan past GLBdan olib tashlangan

function ReadyPlayerMeAvatar({ pose, url }: { pose: HandPose; url: string }) {
  const { scene } = useGLTF(url);
  const bonesRef = useRef<FullBoneMap>({});
  const morphRef = useRef<MorphTargetMap>({});
  const fingerCur = useRef<Record<string, number>>({});
  const faceCur = useRef<Record<string, number>>({});
  const armCur = useRef({
    lShoulder: 0, lElbow: 0, lRot: 0,
    rShoulder: 0, rElbow: 0, rRot: 0,
  });
  const headCur = useRef({ x: 0, y: 0, z: 0 });
  const spineCur = useRef({ x: 0, y: 0, z: 0 });
  const nextBlink = useRef(3 + Math.random() * 2);
  const blinkPhase = useRef(-1);

  const cloned = useMemo(() => {
    const c = scene.clone(true);
    c.traverse((obj) => {
      // Mixamo suyak nomlaridan "mixamorig:" prefiksini olib tashlash
      if ((obj as any).isBone) {
        obj.name = obj.name.replace("mixamorig:", "");
      }
      if ((obj as THREE.Mesh).isMesh) {
        const m = obj as THREE.Mesh;
        m.castShadow = true;
        m.receiveShadow = true;
        // Har bir materialga clipping plane qo'shish
        if (Array.isArray(m.material)) {
          m.material = m.material.map((mat) => {
            const newMat = mat.clone();
            
            
            
            return newMat;
          });
        } else if (m.material) {
          m.material = (m.material as THREE.Material).clone();
          
          
          
        }
      }
    });
    const bones = extractBones(c);
    const morphs = extractMorphTargets(c);
    bonesRef.current = bones;
    morphRef.current = morphs;
    if (bones.LeftArm) bones.LeftArm.rotation.set(0, 0, 1.25);
    if (bones.RightArm) bones.RightArm.rotation.set(0, 0, -1.25);
    return c;
  }, [scene]);

  useFrame((state, delta) => {
    const t = Math.min(delta * 8, 1);
    const b = bonesRef.current;
    const c = armCur.current;
    const elapsed = state.clock.elapsedTime;

    // Arm IK
    c.lShoulder = lerp(c.lShoulder, pose.leftArm.shoulder, t);
    c.lElbow = lerp(c.lElbow, pose.leftArm.elbow, t);
    c.lRot = lerp(c.lRot, pose.leftArm.rotation, t);
    c.rShoulder = lerp(c.rShoulder, pose.rightArm.shoulder, t);
    c.rElbow = lerp(c.rElbow, pose.rightArm.elbow, t);
    c.rRot = lerp(c.rRot, pose.rightArm.rotation, t);

    if (b.LeftArm) slerpBone(b.LeftArm, -c.lShoulder * 0.4, c.lRot, 1.25 - c.lShoulder, t);
    if (b.RightArm) slerpBone(b.RightArm, -c.rShoulder * 0.4, -c.rRot, -1.25 + c.rShoulder, t);
    if (b.LeftForeArm) slerpBone(b.LeftForeArm, 0, c.lElbow, 0, t);
    if (b.RightForeArm) slerpBone(b.RightForeArm, 0, -c.rElbow, 0, t);

    // Wrist
    const lShape = HAND_SHAPES[pose.leftHand] ?? HAND_SHAPES.rest;
    const rShape = HAND_SHAPES[pose.rightHand] ?? HAND_SHAPES.rest;
    if (b.LeftHand) slerpBone(b.LeftHand, lShape.wristBend, 0, lShape.wristTwist, t);
    if (b.RightHand) slerpBone(b.RightHand, rShape.wristBend, 0, -rShape.wristTwist, t);

    // Fingers
    applyFingers(b, "Left", lShape, fingerCur.current, t);
    applyFingers(b, "Right", rShape, fingerCur.current, t);

    // Head pose from sign data
    const headTarget = pose.head ?? { x: 0, y: 0, z: 0 };
    const hc = headCur.current;
    hc.x = lerp(hc.x, headTarget.x, t);
    hc.y = lerp(hc.y, headTarget.y, t);
    hc.z = lerp(hc.z, headTarget.z, t);

    // Spine from sign data
    const spineTarget = pose.spine ?? { x: 0, y: 0, z: 0 };
    const sc = spineCur.current;
    sc.x = lerp(sc.x, spineTarget.x, t);
    sc.y = lerp(sc.y, spineTarget.y, t);
    sc.z = lerp(sc.z, spineTarget.z, t);

    // Idle animation layered on top
    const breathe = Math.sin(elapsed * 1.5) * 0.01;
    const headDrift = Math.sin(elapsed * 0.4) * 0.03;
    const headTilt = Math.sin(elapsed * 0.3 + 1) * 0.015;

    if (b.Spine2) slerpBone(b.Spine2, sc.x + breathe, sc.y, sc.z, t);
    if (b.Spine1) b.Spine1.rotation.x = breathe * 0.5;
    if (b.Neck) b.Neck.rotation.x = breathe * 0.3;
    if (b.Head) slerpBone(b.Head, hc.x + headTilt, hc.y + headDrift, hc.z, t);

    // Face morph targets
    const facePresetName = pose.face ?? "neutral";
    const facePreset = FACE_PRESETS[facePresetName] ?? FACE_PRESETS.neutral;
    const faceTarget: Record<string, number> = { ...facePreset };

    // Blink system
    nextBlink.current -= delta;
    if (nextBlink.current <= 0 && blinkPhase.current < 0) {
      blinkPhase.current = 0;
      nextBlink.current = 3 + Math.random() * 4;
    }
    if (blinkPhase.current >= 0) {
      blinkPhase.current += delta;
      const bp = blinkPhase.current;
      let blinkVal = 0;
      if (bp < 0.08) blinkVal = bp / 0.08;
      else if (bp < 0.14) blinkVal = 1;
      else if (bp < 0.22) blinkVal = 1 - (bp - 0.14) / 0.08;
      else blinkPhase.current = -1;
      faceTarget.eyeBlinkLeft = Math.max(faceTarget.eyeBlinkLeft ?? 0, blinkVal);
      faceTarget.eyeBlinkRight = Math.max(faceTarget.eyeBlinkRight ?? 0, blinkVal);
    }

    // Subtle brow movement during signing
    const isActive = pose !== REST_POSE && (pose.leftArm.shoulder > 0.1 || pose.rightArm.shoulder > 0.1);
    if (isActive) {
      faceTarget.browInnerUp = (faceTarget.browInnerUp ?? 0) + Math.sin(elapsed * 2) * 0.08;
    }

    applyMorphTargets(morphRef.current, faceTarget, faceCur.current, t * 0.7);
  });

  // scale=0.012: Mixamo cm -> Three.js m (175cm * 0.012 = 2.1 units)
  // position Y=-1.5: oyoqlar pastga tushadi, bel Y≈-0.3, ko'krak Y≈0.12, bosh Y≈0.48
  return <primitive object={cloned} scale={1} position={[0, 0, 0]} rotation={[0, Math.PI, 0]} />;
}

function StylizedAvatar({ pose }: { pose: HandPose }) {
  const cur = useRef({
    lShoulder: 0, lElbow: 0,
    rShoulder: 0, rElbow: 0,
  });
  const leftUpperRef = useRef<THREE.Group>(null);
  const leftLowerRef = useRef<THREE.Group>(null);
  const rightUpperRef = useRef<THREE.Group>(null);
  const rightLowerRef = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Group>(null);

  useFrame((state, delta) => {
    const t = Math.min(delta * 6, 1);
    const c = cur.current;
    c.lShoulder = lerp(c.lShoulder, pose.leftArm.shoulder, t);
    c.lElbow = lerp(c.lElbow, pose.leftArm.elbow, t);
    c.rShoulder = lerp(c.rShoulder, pose.rightArm.shoulder, t);
    c.rElbow = lerp(c.rElbow, pose.rightArm.elbow, t);

    if (leftUpperRef.current) leftUpperRef.current.rotation.z = 1.2 - c.lShoulder;
    if (leftLowerRef.current) leftLowerRef.current.rotation.z = -c.lElbow * 0.8;
    if (rightUpperRef.current) rightUpperRef.current.rotation.z = -1.2 + c.rShoulder;
    if (rightLowerRef.current) rightLowerRef.current.rotation.z = c.rElbow * 0.8;
    if (bodyRef.current) bodyRef.current.position.y = Math.sin(state.clock.elapsedTime * 1.2) * 0.02;
  });

  const skin = "#f4c9a5";
  const shirt = "#3b82f6";

  return (
    <group ref={bodyRef} position={[0, -0.5, 0]}>
      <mesh position={[0, 0.85, 0]} castShadow>
        <sphereGeometry args={[0.32, 32, 32]} />
        <meshStandardMaterial color={skin} roughness={0.6} />
      </mesh>
      <mesh position={[0, 1.02, -0.02]} castShadow>
        <sphereGeometry args={[0.34, 32, 32, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#2a2a3a" roughness={0.8} />
      </mesh>
      <mesh position={[-0.1, 0.88, 0.28]}>
        <sphereGeometry args={[0.035, 16, 16]} />
        <meshStandardMaterial color="#1a1a2e" />
      </mesh>
      <mesh position={[0.1, 0.88, 0.28]}>
        <sphereGeometry args={[0.035, 16, 16]} />
        <meshStandardMaterial color="#1a1a2e" />
      </mesh>
      <mesh position={[0, 0.55, 0]} castShadow>
        <cylinderGeometry args={[0.1, 0.12, 0.18, 16]} />
        <meshStandardMaterial color={skin} roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.1, 0]} castShadow>
        <capsuleGeometry args={[0.32, 0.55, 8, 16]} />
        <meshStandardMaterial color={shirt} roughness={0.7} />
      </mesh>
      <group position={[-0.38, 0.4, 0]}>
        <group ref={leftUpperRef}>
          <mesh position={[0, -0.22, 0]} castShadow>
            <capsuleGeometry args={[0.08, 0.32, 8, 16]} />
            <meshStandardMaterial color={shirt} roughness={0.7} />
          </mesh>
          <group position={[0, -0.46, 0]}>
            <group ref={leftLowerRef}>
              <mesh position={[0, -0.2, 0]} castShadow>
                <capsuleGeometry args={[0.07, 0.28, 8, 16]} />
                <meshStandardMaterial color={skin} roughness={0.6} />
              </mesh>
              <mesh position={[0, -0.42, 0]} castShadow>
                <sphereGeometry args={[0.085, 16, 16]} />
                <meshStandardMaterial color={skin} roughness={0.6} />
              </mesh>
            </group>
          </group>
        </group>
      </group>
      <group position={[0.38, 0.4, 0]}>
        <group ref={rightUpperRef}>
          <mesh position={[0, -0.22, 0]} castShadow>
            <capsuleGeometry args={[0.08, 0.32, 8, 16]} />
            <meshStandardMaterial color={shirt} roughness={0.7} />
          </mesh>
          <group position={[0, -0.46, 0]}>
            <group ref={rightLowerRef}>
              <mesh position={[0, -0.2, 0]} castShadow>
                <capsuleGeometry args={[0.07, 0.28, 8, 16]} />
                <meshStandardMaterial color={skin} roughness={0.6} />
              </mesh>
              <mesh position={[0, -0.42, 0]} castShadow>
                <sphereGeometry args={[0.085, 16, 16]} />
                <meshStandardMaterial color={skin} roughness={0.6} />
              </mesh>
            </group>
          </group>
        </group>
      </group>
    </group>
  );
}

class AvatarErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: Error) {
    console.warn("[SignAvatar] GLB load failed, using stylized fallback:", error.message);
  }
  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

const _cameraTarget = new THREE.Vector3(0, 1.5, 0);

function FixedCamera() {
  const { camera } = useThree();
  useFrame(() => {
    camera.position.set(0, 1.5, 2.5);
    camera.lookAt(_cameraTarget);
  });
  return null;
}

function DragRotate({ groupRef }: { groupRef: React.RefObject<THREE.Group | null> }) {
  const { gl } = useThree();
  const dragging = useRef(false);
  const prevX = useRef(0);

  useEffect(() => {
    const canvas = gl.domElement;
    const onDown = (e: PointerEvent) => {
      dragging.current = true;
      prevX.current = e.clientX;
      canvas.setPointerCapture(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging.current || !groupRef.current) return;
      const dx = e.clientX - prevX.current;
      groupRef.current.rotation.y += dx * 0.008;
      prevX.current = e.clientX;
    };
    const onUp = (e: PointerEvent) => {
      dragging.current = false;
      canvas.releasePointerCapture(e.pointerId);
    };
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onUp);
    return () => {
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
    };
  }, [gl, groupRef]);

  return null;
}

const Loader = () => (
  <Html center>
    <div className="text-xs text-muted-foreground bg-background/80 px-3 py-1.5 rounded-full backdrop-blur">
      Avatar yuklanmoqda…
    </div>
  </Html>
);

interface SignAvatarProps {
  pose?: HandPose;
  className?: string;
  compact?: boolean;
  avatarUrl?: string;
}

function useAvatarColors() {
  const [bg, setBg] = useState("#f8fafc");

  useEffect(() => {
    const update = () => {
      const s = getComputedStyle(document.documentElement);
      setBg(s.getPropertyValue("--avatar-bg").trim() || "#f8fafc");
    };
    update();
    const obs = new MutationObserver(update);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  return { bg };
}

export const SignAvatar = ({
  pose = REST_POSE,
  className = "",
  compact = false,
  avatarUrl,
}: SignAvatarProps) => {
  const url = avatarUrl?.trim() || DEFAULT_AVATAR_URL;
  const { bg } = useAvatarColors();
  const avatarGroupRef = useRef<THREE.Group>(null);
  return (
    <div className={`w-full h-full ${className}`}>
      <Canvas
        shadows
        camera={{ position: [0, 1.5, 2.5], fov: 35 }}
        dpr={[1, 2]}
        gl={{ antialias: true, localClippingEnabled: false }}
      >
        <color attach="background" args={[bg]} />

        <ambientLight intensity={0.6} />
        <directionalLight
          position={[5, 8, 3]}
          intensity={1.8}
          castShadow
          shadow-mapSize={[1024, 1024]}
        />
        <directionalLight position={[-4, 4, -3]} intensity={0.4} color="#b0c4de" />
        <directionalLight position={[0, -2, -4]} intensity={0.2} color="#ffeedd" />
        <hemisphereLight args={["#b1e1ff", "#b97a20", 0.3]} />

        <group ref={avatarGroupRef}>
          <AvatarErrorBoundary fallback={<StylizedAvatar pose={pose} />}>
            <Suspense fallback={<Loader />}>
              <ReadyPlayerMeAvatar pose={pose} url={url} />
            </Suspense>
          </AvatarErrorBoundary>
        </group>

        <ContactShadows position={[0, 0, 0]} opacity={0.35} scale={3} blur={2.4} />

        <FixedCamera />
        <DragRotate groupRef={avatarGroupRef} />
      </Canvas>
    </div>
  );
};
