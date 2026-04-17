import { useRef, useEffect, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Environment, ContactShadows } from "@react-three/drei";
import * as THREE from "three";
import { HandPose, HandShape, REST_POSE } from "@/lib/signEngine";

interface AvatarProps {
  pose: HandPose;
}

// Hand shape → finger curl values (0 = straight, 1 = curled)
const HAND_SHAPES: Record<HandShape, { thumb: number; index: number; middle: number; ring: number; pinky: number; spread: number }> = {
  open:   { thumb: 0,    index: 0,    middle: 0,    ring: 0,    pinky: 0,    spread: 0.3 },
  fist:   { thumb: 0.9,  index: 1,    middle: 1,    ring: 1,    pinky: 1,    spread: 0   },
  point:  { thumb: 0.9,  index: 0,    middle: 1,    ring: 1,    pinky: 1,    spread: 0   },
  peace:  { thumb: 0.9,  index: 0,    middle: 0,    ring: 1,    pinky: 1,    spread: 0.4 },
  ok:     { thumb: 0.6,  index: 0.6,  middle: 0,    ring: 0,    pinky: 0,    spread: 0.2 },
  thumb:  { thumb: 0,    index: 1,    middle: 1,    ring: 1,    pinky: 1,    spread: 0   },
  rock:   { thumb: 0.9,  index: 0,    middle: 1,    ring: 1,    pinky: 0,    spread: 0.3 },
  flat:   { thumb: 0.4,  index: 0,    middle: 0,    ring: 0,    pinky: 0,    spread: 0.1 },
  claw:   { thumb: 0.5,  index: 0.5,  middle: 0.5,  ring: 0.5,  pinky: 0.5,  spread: 0.4 },
  pinch:  { thumb: 0.7,  index: 0.7,  middle: 1,    ring: 1,    pinky: 1,    spread: 0.1 },
  L:      { thumb: 0,    index: 0,    middle: 1,    ring: 1,    pinky: 1,    spread: 0.5 },
  C:      { thumb: 0.4,  index: 0.4,  middle: 0.4,  ring: 0.4,  pinky: 0.4,  spread: 0.3 },
  Y:      { thumb: 0,    index: 1,    middle: 1,    ring: 1,    pinky: 0,    spread: 0.5 },
};

// Smooth value interpolation
function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

const Hand = ({ shape, side }: { shape: HandShape; side: "left" | "right" }) => {
  const palmRef = useRef<THREE.Group>(null);
  const fingersRef = useRef<{ [key: string]: THREE.Group | null }>({});
  const targetRef = useRef(HAND_SHAPES[shape]);
  const currentRef = useRef({ ...HAND_SHAPES[shape] });

  useEffect(() => {
    targetRef.current = HAND_SHAPES[shape];
  }, [shape]);

  useFrame((_, delta) => {
    const t = Math.min(delta * 8, 1);
    const c = currentRef.current;
    const tg = targetRef.current;
    c.thumb = lerp(c.thumb, tg.thumb, t);
    c.index = lerp(c.index, tg.index, t);
    c.middle = lerp(c.middle, tg.middle, t);
    c.ring = lerp(c.ring, tg.ring, t);
    c.pinky = lerp(c.pinky, tg.pinky, t);
    c.spread = lerp(c.spread, tg.spread, t);

    const fingers = fingersRef.current;
    if (fingers.thumb) fingers.thumb.rotation.x = -c.thumb * 1.2;
    if (fingers.index) fingers.index.rotation.x = -c.index * 1.4;
    if (fingers.middle) fingers.middle.rotation.x = -c.middle * 1.4;
    if (fingers.ring) fingers.ring.rotation.x = -c.ring * 1.4;
    if (fingers.pinky) fingers.pinky.rotation.x = -c.pinky * 1.4;
  });

  const skinColor = "#f4c8a8";
  const fingerLen = 0.18;
  const fingerWidth = 0.05;

  return (
    <group ref={palmRef}>
      {/* Palm */}
      <mesh castShadow>
        <boxGeometry args={[0.22, 0.28, 0.07]} />
        <meshStandardMaterial color={skinColor} roughness={0.6} />
      </mesh>
      {/* Thumb */}
      <group
        ref={(el) => (fingersRef.current.thumb = el)}
        position={[side === "right" ? -0.13 : 0.13, -0.05, 0]}
        rotation={[0, 0, side === "right" ? 0.6 : -0.6]}
      >
        <mesh position={[0, fingerLen / 2, 0]} castShadow>
          <boxGeometry args={[fingerWidth, fingerLen, fingerWidth]} />
          <meshStandardMaterial color={skinColor} roughness={0.6} />
        </mesh>
      </group>
      {/* Index, Middle, Ring, Pinky */}
      {(["index", "middle", "ring", "pinky"] as const).map((f, i) => {
        const x = (i - 1.5) * 0.06;
        return (
          <group key={f} ref={(el) => (fingersRef.current[f] = el)} position={[x, 0.14, 0]}>
            <mesh position={[0, fingerLen / 2, 0]} castShadow>
              <boxGeometry args={[fingerWidth, fingerLen * (f === "middle" ? 1.1 : f === "pinky" ? 0.75 : 1), fingerWidth]} />
              <meshStandardMaterial color={skinColor} roughness={0.6} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
};

const HumanAvatar = ({ pose }: { pose: HandPose }) => {
  const leftShoulderRef = useRef<THREE.Group>(null);
  const rightShoulderRef = useRef<THREE.Group>(null);
  const leftElbowRef = useRef<THREE.Group>(null);
  const rightElbowRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);

  // Smooth interpolation
  const current = useRef({
    leftShoulder: 0, leftElbow: 0, leftRotation: 0,
    rightShoulder: 0, rightElbow: 0, rightRotation: 0,
  });

  useFrame((state, delta) => {
    const t = Math.min(delta * 5, 1);
    const c = current.current;
    c.leftShoulder = lerp(c.leftShoulder, pose.leftArm.shoulder, t);
    c.leftElbow = lerp(c.leftElbow, pose.leftArm.elbow, t);
    c.leftRotation = lerp(c.leftRotation, pose.leftArm.rotation, t);
    c.rightShoulder = lerp(c.rightShoulder, pose.rightArm.shoulder, t);
    c.rightElbow = lerp(c.rightElbow, pose.rightArm.elbow, t);
    c.rightRotation = lerp(c.rightRotation, pose.rightArm.rotation, t);

    if (leftShoulderRef.current) {
      leftShoulderRef.current.rotation.x = -c.leftShoulder;
      leftShoulderRef.current.rotation.z = c.leftRotation;
    }
    if (rightShoulderRef.current) {
      rightShoulderRef.current.rotation.x = -c.rightShoulder;
      rightShoulderRef.current.rotation.z = -c.rightRotation;
    }
    if (leftElbowRef.current) leftElbowRef.current.rotation.x = -c.leftElbow;
    if (rightElbowRef.current) rightElbowRef.current.rotation.x = -c.rightElbow;

    // Subtle breathing
    if (headRef.current) {
      headRef.current.position.y = 1.62 + Math.sin(state.clock.elapsedTime * 1.5) * 0.005;
    }
  });

  const skinColor = "#f4c8a8";
  const shirtColor = "#ffffff";
  const tieColor = "#3b82f6";
  const pantsColor = "#1f2937";
  const hairColor = "#2a1810";

  return (
    <group position={[0, -0.6, 0]}>
      {/* Head */}
      <group ref={headRef} position={[0, 1.62, 0]}>
        <mesh castShadow>
          <sphereGeometry args={[0.18, 32, 32]} />
          <meshStandardMaterial color={skinColor} roughness={0.5} />
        </mesh>
        {/* Hair */}
        <mesh position={[0, 0.08, -0.02]} castShadow>
          <sphereGeometry args={[0.19, 32, 32, 0, Math.PI * 2, 0, Math.PI / 2.2]} />
          <meshStandardMaterial color={hairColor} roughness={0.8} />
        </mesh>
        {/* Glasses */}
        <group position={[0, 0.02, 0.15]}>
          <mesh position={[-0.06, 0, 0]}>
            <torusGeometry args={[0.045, 0.008, 8, 24]} />
            <meshStandardMaterial color="#1a1a1a" roughness={0.3} metalness={0.5} />
          </mesh>
          <mesh position={[0.06, 0, 0]}>
            <torusGeometry args={[0.045, 0.008, 8, 24]} />
            <meshStandardMaterial color="#1a1a1a" roughness={0.3} metalness={0.5} />
          </mesh>
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[0.03, 0.005, 0.005]} />
            <meshStandardMaterial color="#1a1a1a" />
          </mesh>
        </group>
        {/* Eyes */}
        <mesh position={[-0.06, 0.02, 0.16]}>
          <sphereGeometry args={[0.018, 16, 16]} />
          <meshStandardMaterial color="#1a1a1a" />
        </mesh>
        <mesh position={[0.06, 0.02, 0.16]}>
          <sphereGeometry args={[0.018, 16, 16]} />
          <meshStandardMaterial color="#1a1a1a" />
        </mesh>
        {/* Smile */}
        <mesh position={[0, -0.07, 0.16]} rotation={[0, 0, 0]}>
          <torusGeometry args={[0.04, 0.005, 8, 16, Math.PI]} />
          <meshStandardMaterial color="#7a3a3a" />
        </mesh>
      </group>

      {/* Neck */}
      <mesh position={[0, 1.42, 0]} castShadow>
        <cylinderGeometry args={[0.06, 0.07, 0.1, 16]} />
        <meshStandardMaterial color={skinColor} roughness={0.5} />
      </mesh>

      {/* Torso (shirt) */}
      <mesh position={[0, 1.05, 0]} castShadow>
        <boxGeometry args={[0.5, 0.7, 0.25]} />
        <meshStandardMaterial color={shirtColor} roughness={0.7} />
      </mesh>

      {/* Tie */}
      <mesh position={[0, 1.15, 0.13]} castShadow>
        <boxGeometry args={[0.06, 0.5, 0.01]} />
        <meshStandardMaterial color={tieColor} roughness={0.4} />
      </mesh>
      <mesh position={[0, 1.38, 0.13]} castShadow>
        <boxGeometry args={[0.04, 0.06, 0.015]} />
        <meshStandardMaterial color={tieColor} roughness={0.4} />
      </mesh>

      {/* Pants */}
      <mesh position={[-0.11, 0.45, 0]} castShadow>
        <cylinderGeometry args={[0.09, 0.08, 0.55, 16]} />
        <meshStandardMaterial color={pantsColor} roughness={0.7} />
      </mesh>
      <mesh position={[0.11, 0.45, 0]} castShadow>
        <cylinderGeometry args={[0.09, 0.08, 0.55, 16]} />
        <meshStandardMaterial color={pantsColor} roughness={0.7} />
      </mesh>

      {/* LEFT ARM (avatar's left = viewer's right) */}
      <group ref={leftShoulderRef} position={[-0.27, 1.32, 0]}>
        <mesh position={[0, -0.18, 0]} castShadow>
          <cylinderGeometry args={[0.055, 0.05, 0.36, 16]} />
          <meshStandardMaterial color={shirtColor} roughness={0.7} />
        </mesh>
        <group ref={leftElbowRef} position={[0, -0.36, 0]}>
          <mesh position={[0, -0.16, 0]} castShadow>
            <cylinderGeometry args={[0.05, 0.045, 0.32, 16]} />
            <meshStandardMaterial color={shirtColor} roughness={0.7} />
          </mesh>
          <group position={[0, -0.36, 0]} scale={0.6}>
            <Hand shape={pose.leftHand} side="left" />
          </group>
        </group>
      </group>

      {/* RIGHT ARM */}
      <group ref={rightShoulderRef} position={[0.27, 1.32, 0]}>
        <mesh position={[0, -0.18, 0]} castShadow>
          <cylinderGeometry args={[0.055, 0.05, 0.36, 16]} />
          <meshStandardMaterial color={shirtColor} roughness={0.7} />
        </mesh>
        <group ref={rightElbowRef} position={[0, -0.36, 0]}>
          <mesh position={[0, -0.16, 0]} castShadow>
            <cylinderGeometry args={[0.05, 0.045, 0.32, 16]} />
            <meshStandardMaterial color={skinColor} roughness={0.6} />
          </mesh>
          <group position={[0, -0.36, 0]} scale={0.6}>
            <Hand shape={pose.rightHand} side="right" />
          </group>
        </group>
      </group>
    </group>
  );
};

interface SignAvatarProps {
  pose?: HandPose;
  className?: string;
  showControls?: boolean;
}

export const SignAvatar = ({ pose = REST_POSE, className = "", showControls = false }: SignAvatarProps) => {
  return (
    <div className={`w-full h-full ${className}`}>
      <Canvas
        shadows
        camera={{ position: [0, 0.5, 3], fov: 35 }}
        dpr={[1, 2]}
        gl={{ antialias: true }}
      >
        <color attach="background" args={["#f0f7ff"]} />
        <fog attach="fog" args={["#f0f7ff", 5, 12]} />

        <ambientLight intensity={0.6} />
        <directionalLight
          position={[3, 5, 3]}
          intensity={1.2}
          castShadow
          shadow-mapSize={[1024, 1024]}
        />
        <directionalLight position={[-3, 2, -2]} intensity={0.4} color="#3b82f6" />

        <HumanAvatar pose={pose} />

        <ContactShadows position={[0, -0.6, 0]} opacity={0.4} scale={4} blur={2.5} />

        {showControls && <OrbitControls enablePan={false} minDistance={2} maxDistance={5} />}
      </Canvas>
    </div>
  );
};
