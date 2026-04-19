import { Component, ReactNode, Suspense, useEffect, useMemo, useRef, useState } from "react";
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

    if (b.leftArm) b.leftArm.rotation.set(0, 0, 1.25);
    if (b.rightArm) b.rightArm.rotation.set(0, 0, -1.25);
  }, [cloned]);

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

    if (b.leftArm) {
      b.leftArm.rotation.z = 1.25 - c.lShoulder;
      b.leftArm.rotation.x = -c.lShoulder * 0.4;
      b.leftArm.rotation.y = c.lRot;
    }
    if (b.rightArm) {
      b.rightArm.rotation.z = -1.25 + c.rShoulder;
      b.rightArm.rotation.x = -c.rShoulder * 0.4;
      b.rightArm.rotation.y = -c.rRot;
    }
    if (b.leftForeArm) b.leftForeArm.rotation.y = c.lElbow;
    if (b.rightForeArm) b.rightForeArm.rotation.y = -c.rElbow;

    if (b.leftHand) b.leftHand.rotation.z = c.lHandClose * 0.9;
    if (b.rightHand) b.rightHand.rotation.z = -c.rHandClose * 0.9;

    if (b.spine) b.spine.rotation.x = Math.sin(state.clock.elapsedTime * 1.2) * 0.015;
    if (b.head) b.head.rotation.y = Math.sin(state.clock.elapsedTime * 0.6) * 0.04;
  });

  return <primitive object={cloned} position={[0, -1.35, 0]} />;
}

/**
 * Stylized fallback avatar built from primitives.
 * Used when the Ready Player Me GLB fails to load (e.g. CORS / network).
 */
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
      {/* Head */}
      <mesh position={[0, 0.85, 0]} castShadow>
        <sphereGeometry args={[0.32, 32, 32]} />
        <meshStandardMaterial color={skin} roughness={0.6} />
      </mesh>
      {/* Hair */}
      <mesh position={[0, 1.02, -0.02]} castShadow>
        <sphereGeometry args={[0.34, 32, 32, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#2a2a3a" roughness={0.8} />
      </mesh>
      {/* Eyes */}
      <mesh position={[-0.1, 0.88, 0.28]}>
        <sphereGeometry args={[0.035, 16, 16]} />
        <meshStandardMaterial color="#1a1a2e" />
      </mesh>
      <mesh position={[0.1, 0.88, 0.28]}>
        <sphereGeometry args={[0.035, 16, 16]} />
        <meshStandardMaterial color="#1a1a2e" />
      </mesh>
      {/* Neck */}
      <mesh position={[0, 0.55, 0]} castShadow>
        <cylinderGeometry args={[0.1, 0.12, 0.18, 16]} />
        <meshStandardMaterial color={skin} roughness={0.6} />
      </mesh>
      {/* Torso */}
      <mesh position={[0, 0.1, 0]} castShadow>
        <capsuleGeometry args={[0.32, 0.55, 8, 16]} />
        <meshStandardMaterial color={shirt} roughness={0.7} />
      </mesh>

      {/* Left arm group (anchored at shoulder) */}
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

      {/* Right arm group */}
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

// ErrorBoundary catches GLB load failures inside the Canvas
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
        camera={{ position: compact ? [0, 0.1, 3.2] : [0, 0.2, 3.8], fov: compact ? 30 : 32 }}
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

        <AvatarErrorBoundary fallback={<StylizedAvatar pose={pose} />}>
          <Suspense fallback={<Loader />}>
            <ReadyPlayerMeAvatar pose={pose} url={url} />
          </Suspense>
        </AvatarErrorBoundary>

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
