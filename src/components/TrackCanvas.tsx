import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { KeyboardControls, useGLTF, useKeyboardControls, useTexture } from "@react-three/drei";
import { CuboidCollider, Physics, RigidBody, type RapierRigidBody } from "@react-three/rapier";
import * as THREE from "three";
import { useActiveCar, useLab } from "../store/lab";
import { BUILDINGS, nearestBuilding } from "../lib/buildings";
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

/** Shared ref so skid / crates / proximity can read vehicle without prop drilling */
const vehicleBridge = {
  state: null as VehicleState | null,
  slipping: false,
};

const CRATE_PILES: [number, number][] = [
  [-12, 18],
  [-12, 52],
  [12, 70],
  [12, 95],
  [30, -18],
  [54, 30],
  [54, 70],
  [30, 112],
  [-10, 105],
  [60, 50],
];

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

function CircuitTrack() {
  const map = useTexture("/models/track/Textures/colormap.png");
  map.colorSpace = THREE.SRGBColorSpace;
  map.flipY = false;

  // Closed rectangular circuit + skidpad spur. Drive clockwise from spawn (west mid).
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[25, -0.05, 40]} receiveShadow>
        <planeGeometry args={[240, 260]} />
        <meshStandardMaterial color="#1a3a28" />
      </mesh>

      {/* West / East / South / North — connected rectangle */}
      <AsphaltStrip position={[0, 0, 45]} size={[12, 100]} />
      <AsphaltStrip position={[42, 0, 45]} size={[12, 100]} />
      <AsphaltStrip position={[21, 0, -10]} size={[54, 12]} />
      <AsphaltStrip position={[21, 0, 100]} size={[54, 12]} />

      {/* Corner fillets so the joins read as continuous asphalt */}
      <AsphaltStrip position={[0, 0.005, -10]} size={[12, 12]} color="#282c31" />
      <AsphaltStrip position={[42, 0.005, -10]} size={[12, 12]} color="#282c31" />
      <AsphaltStrip position={[0, 0.005, 100]} size={[12, 12]} color="#282c31" />
      <AsphaltStrip position={[42, 0.005, 100]} size={[12, 12]} color="#282c31" />

      {/* Speed-trap section on the west straight */}
      <AsphaltStrip position={[0, 0.01, 74]} size={[11, 32]} color="#25292f" />
      <LaneMark position={[0, 0.03, 60]} size={[0.25, 8]} />
      <LaneMark position={[0, 0.03, 74]} size={[0.25, 8]} />
      <LaneMark position={[0, 0.03, 88]} size={[0.25, 8]} />

      <mesh position={[-5.2, 1.2, 60]}>
        <boxGeometry args={[0.3, 2.4, 0.3]} />
        <meshStandardMaterial color="#f5c542" emissive="#f5c542" emissiveIntensity={0.6} />
      </mesh>
      <mesh position={[5.2, 1.2, 60]}>
        <boxGeometry args={[0.3, 2.4, 0.3]} />
        <meshStandardMaterial color="#f5c542" emissive="#f5c542" emissiveIntensity={0.6} />
      </mesh>
      <mesh position={[-5.2, 1.2, 88]}>
        <boxGeometry args={[0.3, 2.4, 0.3]} />
        <meshStandardMaterial color="#e11d2e" emissive="#e11d2e" emissiveIntensity={0.6} />
      </mesh>
      <mesh position={[5.2, 1.2, 88]}>
        <boxGeometry args={[0.3, 2.4, 0.3]} />
        <meshStandardMaterial color="#e11d2e" emissive="#e11d2e" emissiveIntensity={0.6} />
      </mesh>

      {/* Skidpad east of the circuit + access road */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[72, 0.01, 45]} receiveShadow>
        <ringGeometry args={[10, 16, 64]} />
        <meshStandardMaterial color="#30343a" roughness={0.9} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[72, 0.02, 45]}>
        <ringGeometry args={[12.8, 13.2, 64]} />
        <meshStandardMaterial color="#f5c542" />
      </mesh>
      <AsphaltStrip position={[57, 0, 45]} size={[20, 8]} />

      {/* Finish line on west straight */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 12]}>
        <planeGeometry args={[10, 1.2]} />
        <meshStandardMaterial color="#f4f4f4" />
      </mesh>

      <TrackProp url="/models/track/decoration-tents.glb" map={map} position={[-18, 0, 48]} scale={1} />
      <TrackProp url="/models/track/decoration-forest.glb" map={map} position={[90, 0, 70]} scale={1.1} />
      <TrackProp url="/models/track/track-finish.glb" map={map} position={[0, 0.02, 12]} scale={0.9} />

      <Sign position={[-9, 0, 74]} label="# SPEED TRAP" />
      <Sign position={[72, 0, 26]} label="# SKIDPAD" />
      <Sign position={[21, 0, 108]} label="# NORTH LINK" />
      <Sign position={[9, 0, 45]} label="# CIRCUIT" />

      <CircuitBuildings />
    </group>
  );
}

function Sign({ position }: { position: [number, number, number]; label: string }) {
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
      <mesh position={[0, 2.6, 0.12]}>
        <planeGeometry args={[4.2, 0.55]} />
        <meshStandardMaterial color="#e11d2e" emissive="#e11d2e" emissiveIntensity={0.35} />
      </mesh>
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

function CircuitBuildings() {
  const map = useTexture("/models/buildings/Textures/colormap.png");
  map.colorSpace = THREE.SRGBColorSpace;
  map.flipY = false;

  return (
    <group>
      {BUILDINGS.map((b) => (
        <BuildingModel key={b.id} def={b} map={map} />
      ))}
    </group>
  );
}

function BuildingModel({
  def,
  map,
}: {
  def: (typeof BUILDINGS)[number];
  map: THREE.Texture;
}) {
  const { scene } = useGLTF(def.model);
  const cloned = useMemo(() => {
    const root = scene.clone(true);
    root.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
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

  return (
    <group position={def.position} rotation={[0, def.rotationY, 0]} scale={def.scale}>
      <primitive object={cloned} />
      {/* Soft glow pad so buildings read as destinations */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <circleGeometry args={[1.4, 24]} />
        <meshStandardMaterial color="#f5c542" transparent opacity={0.22} emissive="#f5c542" emissiveIntensity={0.4} />
      </mesh>
    </group>
  );
}

function CratePile({ x, z }: { x: number; z: number }) {
  const colors = ["#c45c26", "#d4a017", "#5b7c99"];
  return (
    <group>
      {[0, 1, 2].map((i) => (
        <RigidBody
          key={i}
          colliders={false}
          position={[x + (i - 1) * 0.08, 0.45 + i * 0.92, z + (i % 2) * 0.06]}
          restitution={0.15}
          friction={0.85}
          linearDamping={0.35}
          angularDamping={0.45}
          mass={8}
        >
          <CuboidCollider args={[0.45, 0.45, 0.45]} />
          <mesh castShadow receiveShadow>
            <boxGeometry args={[0.9, 0.9, 0.9]} />
            <meshStandardMaterial color={colors[i]} roughness={0.75} metalness={0.08} />
          </mesh>
          {/* Crate banding */}
          <mesh position={[0, 0, 0.451]}>
            <planeGeometry args={[0.7, 0.12]} />
            <meshStandardMaterial color="#2a2118" />
          </mesh>
        </RigidBody>
      ))}
    </group>
  );
}

function CrateField() {
  return (
    <group>
      {CRATE_PILES.map(([x, z], i) => (
        <CratePile key={i} x={x} z={z} />
      ))}
    </group>
  );
}

/** Kinematic body that mirrors the custom vehicle so crates get knocked over */
function CarCollider() {
  const body = useRef<RapierRigidBody>(null);

  useFrame(() => {
    const v = vehicleBridge.state;
    const rb = body.current;
    if (!v || !rb) return;
    rb.setNextKinematicTranslation({ x: v.x, y: 0.55, z: v.z });
    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), v.yaw);
    rb.setNextKinematicRotation({ x: q.x, y: q.y, z: q.z, w: q.w });
  });

  return (
    <RigidBody ref={body} type="kinematicPosition" colliders={false} position={[0, 0.55, 22]}>
      <CuboidCollider args={[0.95, 0.5, 2.1]} />
    </RigidBody>
  );
}

function GroundCollider() {
  return (
    <RigidBody type="fixed" colliders={false} position={[25, -0.05, 40]}>
      <CuboidCollider args={[120, 0.05, 130]} />
    </RigidBody>
  );
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
  if (x > 56 && Math.hypot(x - 72, z - 45) < 18) return "Skidpad";
  if (z > 58 && z < 92 && Math.abs(x) < 8) return "Speed Trap";
  if (z > 94 && x > -8 && x < 50) return "North Link";
  if (x > -8 && x < 50 && z > -16 && z < 102) return "Circuit";
  return "Runoff";
}

function DriveCar() {
  const car = useActiveCar();
  const tuning = useLab((s) => s.tuning);
  const setTelemetry = useLab((s) => s.setTelemetry);
  const setNearbyBuilding = useLab((s) => s.setNearbyBuilding);
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
      useLab.getState().setNearbyBuilding(null);
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

    // Lap line on west straight, traveling north
    if (Math.abs(v.x) < 6 && v.z > 11 && v.z < 13.5 && v.vx > 2) {
      if (!st.crossed) {
        st.crossed = true;
        if (st.bestLap === 0 || st.lapTime < st.bestLap) st.bestLap = st.lapTime;
        st.lapTime = 0;
      }
    } else if (v.z < 8 || v.z > 16) {
      st.crossed = false;
    }

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

    setNearbyBuilding(nearestBuilding(v.x, v.z));

    const steerInput = input.steer;
    if (group.current) {
      group.current.position.set(v.x, 0.05, v.z);
      group.current.rotation.y = v.yaw;
      group.current.rotation.z = THREE.MathUtils.lerp(
        group.current.rotation.z,
        -steerInput * 0.06 - (v.ay / 12) * 0.12,
        0.15,
      );
      group.current.rotation.x = THREE.MathUtils.lerp(group.current.rotation.x, -v.ax * 0.012, 0.12);
    }

    const cosY = Math.cos(v.yaw);
    const sinY = Math.sin(v.yaw);
    const wvx = sinY * v.vx + cosY * v.vy;
    const wvz = cosY * v.vx - sinY * v.vy;
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
      <fog attach="fog" args={["#9ec5e8", 70, 180]} />
      <ambientLight intensity={0.55} />
      <directionalLight position={[25, 35, 12]} intensity={2.3} castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048} />
      <hemisphereLight args={["#cfe8ff", "#3d5c40", 0.45]} />
      <Suspense fallback={null}>
        <CircuitTrack />
        <SkidMarks />
        <DriveCar />
        <Physics gravity={[0, -18, 0]} interpolate>
          <GroundCollider />
          <CarCollider />
          <CrateField />
        </Physics>
      </Suspense>
    </>
  );
}

export function TrackCanvas() {
  const carId = useLab((s) => s.carId);
  useEffect(() => {
    useLab.getState().resetLap();
    useLab.getState().setNearbyBuilding(null);
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
  ...BUILDINGS.map((b) => b.model),
].forEach((u) => useGLTF.preload(u));
