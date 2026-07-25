import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { KeyboardControls, useGLTF, useKeyboardControls, useTexture } from "@react-three/drei";
import * as THREE from "three";
import { useActiveCar, useLab } from "../store/lab";
import {
  FIXED_DT,
  MAX_SUBSTEPS,
  createVehicleState,
  setupFromTuning,
  stepVehicle,
  type VehicleState,
} from "../lib/vehiclePhysics";

const controlsMap = [
  { name: "forward", keys: ["ArrowUp", "KeyW"] },
  { name: "back", keys: ["ArrowDown", "KeyS"] },
  { name: "left", keys: ["ArrowLeft", "KeyA"] },
  { name: "right", keys: ["ArrowRight", "KeyD"] },
  { name: "brake", keys: ["Space"] },
];

/** Shared ref so skid system can read vehicle without prop drilling */
const vehicleBridge = {
  state: null as VehicleState | null,
  slipping: false,
};

function AsphaltStrip({
  position,
  size,
  rotation = 0,
  color = "#2a2e33",
}: {
  position: [number, number, number];
  size: [number, number];
  rotation?: number;
  color?: string;
}) {
  return (
    <mesh position={position} rotation={[-Math.PI / 2, 0, rotation]} receiveShadow>
      <planeGeometry args={size} />
      <meshStandardMaterial color={color} roughness={0.92} metalness={0.05} />
    </mesh>
  );
}

function LaneMark({ position, size, rotation = 0 }: { position: [number, number, number]; size: [number, number]; rotation?: number }) {
  return (
    <mesh position={position} rotation={[-Math.PI / 2, 0, rotation]}>
      <planeGeometry args={size} />
      <meshStandardMaterial color="#e8e4d4" roughness={1} />
    </mesh>
  );
}

function TeachingTrack() {
  const map = useTexture("/models/track/Textures/colormap.png");
  map.colorSpace = THREE.SRGBColorSpace;
  map.flipY = false;

  // Procedural circuit: long N-S straight (speed trap), oval-ish loop, skidpad to the east
  return (
    <group>
      {/* Grass */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 20]} receiveShadow>
        <planeGeometry args={[180, 200]} />
        <meshStandardMaterial color="#1a3a28" />
      </mesh>

      {/* Main oval / loop asphalt */}
      <AsphaltStrip position={[0, 0, 20]} size={[14, 70]} />
      <AsphaltStrip position={[28, 0, 20]} size={[14, 70]} />
      <AsphaltStrip position={[14, 0, -18]} size={[42, 14]} />
      <AsphaltStrip position={[14, 0, 58]} size={[42, 14]} />

      {/* Long speed-trap extension north */}
      <AsphaltStrip position={[0, 0, 72]} size={[12, 36]} color="#25292f" />
      <LaneMark position={[0, 0.02, 55]} size={[0.25, 8]} />
      <LaneMark position={[0, 0.02, 70]} size={[0.25, 8]} />
      <LaneMark position={[0, 0.02, 85]} size={[0.25, 8]} />

      {/* Speed trap gates */}
      <mesh position={[-5.5, 1.2, 60]}>
        <boxGeometry args={[0.3, 2.4, 0.3]} />
        <meshStandardMaterial color="#f5c542" emissive="#f5c542" emissiveIntensity={0.6} />
      </mesh>
      <mesh position={[5.5, 1.2, 60]}>
        <boxGeometry args={[0.3, 2.4, 0.3]} />
        <meshStandardMaterial color="#f5c542" emissive="#f5c542" emissiveIntensity={0.6} />
      </mesh>
      <mesh position={[-5.5, 1.2, 88]}>
        <boxGeometry args={[0.3, 2.4, 0.3]} />
        <meshStandardMaterial color="#e11d2e" emissive="#e11d2e" emissiveIntensity={0.6} />
      </mesh>
      <mesh position={[5.5, 1.2, 88]}>
        <boxGeometry args={[0.3, 2.4, 0.3]} />
        <meshStandardMaterial color="#e11d2e" emissive="#e11d2e" emissiveIntensity={0.6} />
      </mesh>

      {/* Skidpad circle (east) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[52, 0.01, 20]} receiveShadow>
        <ringGeometry args={[10, 16, 64]} />
        <meshStandardMaterial color="#30343a" roughness={0.9} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[52, 0.02, 20]}>
        <ringGeometry args={[12.8, 13.2, 64]} />
        <meshStandardMaterial color="#f5c542" />
      </mesh>
      {/* Access road to skidpad */}
      <AsphaltStrip position={[38, 0, 20]} size={[18, 8]} />

      {/* Finish / sector line on main straight */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 8]}>
        <planeGeometry args={[12, 1.2]} />
        <meshStandardMaterial color="#f4f4f4" />
      </mesh>

      {/* Kenney props for flavor */}
      <TrackProp url="/models/track/decoration-tents.glb" map={map} position={[-18, 0, 40]} scale={1} />
      <TrackProp url="/models/track/decoration-forest.glb" map={map} position={[55, 0, -10]} scale={1.1} />
      <TrackProp url="/models/track/track-finish.glb" map={map} position={[0, 0.02, 8]} scale={0.9} />

      {/* Zone labels via simple boards */}
      <Sign position={[-8, 0, 72]} label="# SPEED TRAP" />
      <Sign position={[52, 0, 4]} label="# SKIDPAD" />
      <Sign position={[8, 0, 58]} label="# MAIN LOOP" />
    </group>
  );
}

function Sign({ position, label }: { position: [number, number, number]; label: string }) {
  return (
    <group position={position}>
      <mesh position={[0, 1.4, 0]}>
        <boxGeometry args={[0.15, 2.8, 0.15]} />
        <meshStandardMaterial color="#222" />
      </mesh>
      <mesh position={[0, 2.6, 0.1]}>
        <planeGeometry args={[4.5, 0.9]} />
        <meshStandardMaterial color="#0e1015" />
      </mesh>
      {/* label is HUD-only conceptually; keep visual block */}
      <mesh position={[0, 2.6, 0.12]}>
        <planeGeometry args={[4.2, 0.55]} />
        <meshStandardMaterial color="#e11d2e" emissive="#e11d2e" emissiveIntensity={0.35} />
      </mesh>
      <group visible={false}>
        <mesh userData={{ label }} />
      </group>
    </group>
  );
}

function TrackProp({
  url,
  map,
  position,
  scale,
}: {
  url: string;
  map: THREE.Texture;
  position: [number, number, number];
  scale: number;
}) {
  const { scene } = useGLTF(url);
  const cloned = useMemo(() => {
    const root = scene.clone(true);
    root.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      mats.forEach((m) => {
        const mat = m as THREE.MeshStandardMaterial;
        if (!mat?.isMeshStandardMaterial) return;
        mat.map = map;
        mat.needsUpdate = true;
      });
    });
    return root;
  }, [scene, map]);
  return <primitive object={cloned} position={position} scale={scale} />;
}

function SkidMarks() {
  const marks = useRef<{ x: number; z: number; yaw: number; life: number }[]>([]);
  const meshRefs = useRef<(THREE.Mesh | null)[]>([]);
  const MAX = 80;

  useFrame((_, dt) => {
    const s = vehicleBridge.state;
    if (s && vehicleBridge.slipping && Math.hypot(s.vx, s.vy) > 4) {
      const last = marks.current[marks.current.length - 1];
      const dist = last ? Math.hypot(s.x - last.x, s.z - last.z) : 99;
      if (dist > 0.55) {
        marks.current.push({ x: s.x, z: s.z, yaw: s.yaw, life: 1 });
        if (marks.current.length > MAX) marks.current.shift();
      }
    }
    marks.current.forEach((m) => {
      m.life -= dt * 0.12;
    });
    marks.current = marks.current.filter((m) => m.life > 0);

    marks.current.forEach((m, i) => {
      const mesh = meshRefs.current[i];
      if (!mesh) return;
      mesh.visible = true;
      mesh.position.set(m.x, 0.04, m.z);
      mesh.rotation.y = m.yaw;
      const mat = mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = Math.min(0.55, m.life * 0.55);
    });
    for (let i = marks.current.length; i < MAX; i++) {
      const mesh = meshRefs.current[i];
      if (mesh) mesh.visible = false;
    }
  });

  return (
    <group>
      {Array.from({ length: MAX }).map((_, i) => (
        <mesh
          key={i}
          ref={(el) => {
            meshRefs.current[i] = el;
          }}
          rotation={[-Math.PI / 2, 0, 0]}
          visible={false}
        >
          <planeGeometry args={[0.35, 1.1]} />
          <meshBasicMaterial color="#1a1a1a" transparent opacity={0.4} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

function zoneAt(x: number, z: number): string {
  if (x > 36 && Math.hypot(x - 52, z - 20) < 18) return "Skidpad";
  if (z > 55 && Math.abs(x) < 8) return "Speed Trap";
  if (Math.abs(x) < 22 && z > -25 && z < 65) return "Main Loop";
  return "Runoff";
}

function DriveCar() {
  const car = useActiveCar();
  const tuning = useLab((s) => s.tuning);
  const setTelemetry = useLab((s) => s.setTelemetry);
  const group = useRef<THREE.Group>(null);
  const { scene } = useGLTF(car.model);
  const { camera } = useThree();
  const [, getKeys] = useKeyboardControls();

  const model = useMemo(() => {
    const root = scene.clone(true);
    root.traverse((o: THREE.Object3D) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        m.castShadow = true;
        m.receiveShadow = true;
      }
    });
    return root;
  }, [scene]);

  const sim = useRef({
    vehicle: createVehicleState({ x: 0, z: 22, yaw: 0 }),
    acc: 0,
    bestLap: 0,
    lapTime: 0,
    crossed: false,
    trapArmed: false,
    trapEntrySpeed: 0,
    bestTrap: 0,
    shake: 0,
    fovPunch: 0,
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "KeyR") return;
      const st = sim.current;
      st.vehicle = createVehicleState({ x: 0, z: 22, yaw: 0 });
      st.lapTime = 0;
      st.crossed = false;
      st.trapArmed = false;
      useLab.getState().resetLap();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useFrame((_, dt) => {
    const keys = getKeys();
    const setup = setupFromTuning(tuning);
    const st = sim.current;
    const v = st.vehicle;

    const input = {
      throttle: keys.forward ? 1 : keys.back ? -0.55 : 0,
      brake: keys.brake ? 1 : 0,
      steer: (keys.left ? 1 : 0) - (keys.right ? 1 : 0),
    };

    // Fixed timestep
    st.acc += Math.min(dt, 0.05);
    let steps = 0;
    while (st.acc >= FIXED_DT && steps < MAX_SUBSTEPS) {
      stepVehicle(v, input, setup, FIXED_DT);
      st.acc -= FIXED_DT;
      steps++;
      st.lapTime += FIXED_DT;
    }

    vehicleBridge.state = v;
    vehicleBridge.slipping = v.slipMag > 0.18;

    const speedMs = Math.hypot(v.vx, v.vy);
    const speedKmh = speedMs * 3.6;

    // Lap line at z≈8, x near 0, traveling north-ish
    if (Math.abs(v.x) < 6 && v.z > 7 && v.z < 9.5 && v.vx > 2) {
      if (!st.crossed) {
        st.crossed = true;
        if (st.bestLap === 0 || st.lapTime < st.bestLap) st.bestLap = st.lapTime;
        st.lapTime = 0;
      }
    } else if (v.z < 5 || v.z > 12) {
      st.crossed = false;
    }

    // Speed trap: enter z=60 → exit z=88 on left straight
    if (Math.abs(v.x) < 6 && v.z > 58 && v.z < 62 && !st.trapArmed) {
      st.trapArmed = true;
      st.trapEntrySpeed = speedKmh;
    }
    if (st.trapArmed && Math.abs(v.x) < 6 && v.z > 86 && v.z < 92) {
      const trap = speedKmh;
      if (trap > st.bestTrap) st.bestTrap = trap;
      st.trapArmed = false;
      setTelemetry({ trapSpeed: trap, bestTrap: st.bestTrap });
    }
    if (v.z < 50) st.trapArmed = false;

    // Visual body lean from lateral/long g
    const steerInput = input.steer;
    if (group.current) {
      group.current.position.set(v.x, 0.05, v.z);
      group.current.rotation.y = v.yaw + Math.PI;
      group.current.rotation.z = THREE.MathUtils.lerp(
        group.current.rotation.z,
        -steerInput * 0.06 - (v.ay / 12) * 0.12,
        0.15,
      );
      group.current.rotation.x = THREE.MathUtils.lerp(group.current.rotation.x, -v.ax * 0.012, 0.12);
    }

    // Camera: follow velocity heading with lag + FOV punch + shake
    const cosY = Math.cos(v.yaw);
    const sinY = Math.sin(v.yaw);
    const wvx = sinY * v.vx + cosY * v.vy;
    const wvz = cosY * v.vx - sinY * v.vy;
    // Only track the velocity vector when driving forward, otherwise the camera flips in reverse
    const moveYaw = v.vx > 1.2 ? Math.atan2(wvx, wvz) : v.yaw;

    st.fovPunch = THREE.MathUtils.lerp(st.fovPunch, Math.max(0, input.throttle) * 6 + speedMs * 0.15, 0.08);
    st.shake = THREE.MathUtils.lerp(st.shake, v.slipMag > 0.35 ? v.slipMag * 0.15 : 0, 0.2);

    const back = 8.2 + Math.min(4, speedMs * 0.08);
    const height = 3.4 + Math.min(1.2, speedMs * 0.03);
    const tx = v.x - Math.sin(moveYaw) * back + (Math.random() - 0.5) * st.shake;
    const tz = v.z - Math.cos(moveYaw) * back + (Math.random() - 0.5) * st.shake;
    const ty = height + (Math.random() - 0.5) * st.shake * 0.5;
    camera.position.lerp(new THREE.Vector3(tx, ty, tz), 1 - Math.exp(-3.2 * dt));
    camera.lookAt(v.x + Math.sin(moveYaw) * 4, 0.9, v.z + Math.cos(moveYaw) * 4);
    if ("fov" in camera) {
      const persp = camera as THREE.PerspectiveCamera;
      persp.fov = THREE.MathUtils.lerp(persp.fov, 52 + st.fovPunch, 0.1);
      persp.updateProjectionMatrix();
    }

    setTelemetry({
      speed: speedKmh,
      slip: v.slipMag,
      throttle: Math.max(0, input.throttle),
      brake: input.brake,
      steer: input.steer,
      lapTime: st.lapTime,
      bestLap: st.bestLap,
      lateralG: v.ay / 9.81,
      longG: v.ax / 9.81,
      zone: zoneAt(v.x, v.z),
      bestTrap: st.bestTrap,
    });
  });

  return (
    <group ref={group}>
      <primitive object={model} scale={car.scale * 0.95} />
    </group>
  );
}

function TrackWorld() {
  return (
    <>
      <color attach="background" args={["#7eb0d4"]} />
      <fog attach="fog" args={["#9ec5e8", 50, 130]} />
      <ambientLight intensity={0.55} />
      <directionalLight position={[25, 35, 12]} intensity={2.3} castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048} />
      <hemisphereLight args={["#cfe8ff", "#3d5c40", 0.45]} />
      <Suspense fallback={null}>
        <TeachingTrack />
        <SkidMarks />
        <DriveCar />
      </Suspense>
    </>
  );
}

export function TrackCanvas() {
  const carId = useLab((s) => s.carId);
  useEffect(() => {
    useLab.getState().resetLap();
    vehicleBridge.state = null;
  }, [carId]);

  return (
    <KeyboardControls map={controlsMap}>
      <Canvas
        key={`track-${carId}`}
        shadows
        dpr={[1, 1.5]}
        camera={{ position: [0, 5, 22], fov: 55 }}
        gl={{ antialias: true, alpha: false }}
        style={{ width: "100%", height: "100%" }}
      >
        <TrackWorld />
      </Canvas>
    </KeyboardControls>
  );
}

[
  "/models/track/track-straight.glb",
  "/models/track/track-corner.glb",
  "/models/track/track-finish.glb",
  "/models/track/decoration-tents.glb",
  "/models/track/decoration-forest.glb",
].forEach((u) => useGLTF.preload(u));
