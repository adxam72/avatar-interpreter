import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, ContactShadows, useGLTF, Html } from "@react-three/drei";
import * as THREE from "three";
import { HandPose, REST_POSE } from "@/lib/signEngine";

/**
 * Ready Player Me avatar — half-body GLB model
 * RPM avatars use Mixamo-style bone names (LeftArm, LeftForeArm, RightArm, ...)
 * We rotate bones at runtime to match HandPose.
 */
const DEFAULT_AVATAR_URL =
  "https://models.readyplayer.me/64bfa15f0e72c63d7c3934a6.glb?morphTargets=ARKit&textureAtlas=1024";

type BoneMap = {
  leftArm?: THREE.Bone;
  leftForeArm?: THREE.Bone;
  leftHand?: THREE.Bone;
  rightArm?: THREE.Bone;
  rightForeArm?: THREE.Bone;
  rightHand?: THREE.Bone;
  head?: THREE.Bone;
  spine?: THREE.Bone;
};

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function ReadyPlayerMeAvatar({ pose, url }: { pose: HandPose; url: string }) {
  const { scene } = useGLTF(url);
  const bones = useRef<BoneMap>({});
  const cur = useRef({
    lShoulder: 0, lElbow: 0, lRot: 0,
    rShoulder: 0, rElbow: 0, rRot: 0,
    lHandClose: 0, rHandClose: 0,
  });

  // Clone scene once so multiple instances do not share mutated bones.
  const cloned = useMemo(() => {
    const c = scene.clone(true);
    c.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const m = obj as THREE.Mesh;
        m.castShadow = true;
        m.receiveShadow = true;
      }
    });
    return c;
  }, [scene]);

  useEffect(() => {
    const b: BoneMap = {};
    cloned.traverse((obj) => {
      if ((obj as THREE.Bone).isBone) {
        const name = obj.name;
        if (name === "LeftArm") b.leftArm = obj as THREE.Bone;
        else if (name === "LeftForeArm") b.leftForeArm = obj as THREE.Bone;
        else if (name === "LeftHand") b.leftHand = obj as THREE.Bone;
        else if (name === "RightArm") b.rightArm = obj as THREE.Bone;
        else if (name === "RightForeArm") b.rightForeArm = obj as THREE.Bone;
        else if (name === "RightHand") b.rightHand = obj as THREE.Bone;
        else if (name === "Head") b.head = obj as THREE.Bone;
        else if (name === "Spine2") b.spine = obj as THREE.Bone;
      }
    });
    bones.current = b;

    // Rest pose offsets — RPM arms hang down.
    // Lift them slightly so character looks alive.
    if (b.leftArm) b.leftArm.rotation.set(0, 0, 1.25);
    if (b.rightArm) b.rightArm.rotation.set(0, 0, -1.25);
  }, [cloned]);

  // Hand-close intensity (0 = open, 1 = fist). Maps the 13 abstract shapes loosely.
  const handCloseAmount = (shape: string) => {
    switch (shape) {
      case "fist":
      case "thumb":
        return 0.95;
      case "point":
      case "L":
      case "Y":
        return 0.7;
      case "peace":
      case "rock":
        return 0.55;
      case "ok":
      case "pinch":
      case "C":
        return 0.4;
      case "claw":
        return 0.3;
      case "flat":
      case "open":
      default:
        return 0.05;
    }
  };

  useFrame((state, delta) => {
    const t = Math.min(delta * 6, 1);
    const c = cur.current;
    const b = bones.current;

    c.lShoulder = lerp(c.lShoulder, pose.leftArm.shoulder, t);
    c.lElbow = lerp(c.lElbow, pose.leftArm.elbow, t);
    c.lRot = lerp(c.lRot, pose.leftArm.rotation, t);
    c.rShoulder = lerp(c.rShoulder, pose.rightArm.shoulder, t);
    c.rElbow = lerp(c.rElbow, pose.rightArm.elbow, t);
    c.rRot = lerp(c.rRot, pose.rightArm.rotation, t);
    c.lHandClose = lerp(c.lHandClose, handCloseAmount(pose.leftHand), t);
    c.rHandClose = lerp(c.rHandClose, handCloseAmount(pose.rightHand), t);

    // RPM bone axis convention:
    // - Arm Z controls how far the arm is raised away from body (~1.3 = down, ~0 = sideways, ~-0.5 = up).
    // - Arm X controls forward/back.
    // - ForeArm Y controls elbow bend.
    if (b.leftArm) {
      b.leftArm.rotation.z = 1.25 - c.lShoulder;          // raise arm
      b.leftArm.rotation.x = -c.lShoulder * 0.4;          // forward
      b.leftArm.rotation.y = c.lRot;
    }
    if (b.rightArm) {
      b.rightArm.rotation.z = -1.25 + c.rShoulder;
      b.rightArm.rotation.x = -c.rShoulder * 0.4;
      b.rightArm.rotation.y = -c.rRot;
    }
    if (b.leftForeArm) b.leftForeArm.rotation.y = c.lElbow;
    if (b.rightForeArm) b.rightForeArm.rotation.y = -c.rElbow;

    // Hand close — curl wrists inward when "fist-like".
    if (b.leftHand) b.leftHand.rotation.z = c.lHandClose * 0.9;
    if (b.rightHand) b.rightHand.rotation.z = -c.rHandClose * 0.9;

    // Idle breathing
    if (b.spine) b.spine.rotation.x = Math.sin(state.clock.elapsedTime * 1.2) * 0.015;
    if (b.head) b.head.rotation.y = Math.sin(state.clock.elapsedTime * 0.6) * 0.04;
  });

  return <primitive object={cloned} position={[0, -1.35, 0]} />;
}

useGLTF.preload(DEFAULT_AVATAR_URL);

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
  showControls?: boolean;
  /** Compact variant — smaller, centered, no zoom; good for sidebars / split views. */
  compact?: boolean;
  /** Custom Ready Player Me .glb URL. Falls back to the default avatar. */
  avatarUrl?: string;
}

export const SignAvatar = ({
  pose = REST_POSE,
  className = "",
  showControls = false,
  compact = false,
  avatarUrl,
}: SignAvatarProps) => {
  const url = avatarUrl?.trim() || DEFAULT_AVATAR_URL;
  return (
    <div className={`w-full h-full ${className}`}>
      <Canvas
        shadows
        camera={{ position: compact ? [0, 0.3, 2.4] : [0, 0.4, 2.8], fov: compact ? 28 : 30 }}
        dpr={[1, 2]}
        gl={{ antialias: true }}
      >
        <color attach="background" args={["#f0f7ff"]} />
        <fog attach="fog" args={["#f0f7ff", 4, 10]} />

        <ambientLight intensity={0.7} />
        <directionalLight
          position={[3, 5, 3]}
          intensity={1.1}
          castShadow
          shadow-mapSize={[1024, 1024]}
        />
        <directionalLight position={[-3, 2, -2]} intensity={0.3} color="#3b82f6" />

        <Suspense fallback={<Loader />}>
          <ReadyPlayerMeAvatar pose={pose} url={url} />
        </Suspense>

        <ContactShadows position={[0, -1.35, 0]} opacity={0.35} scale={3} blur={2.4} />

        {showControls && (
          <OrbitControls
            enablePan={false}
            enableZoom={false}
            minPolarAngle={Math.PI / 2.6}
            maxPolarAngle={Math.PI / 1.9}
            target={[0, 0.1, 0]}
          />
        )}
      </Canvas>
    </div>
  );
};
