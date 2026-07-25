import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { KeyboardControls, useGLTF, useKeyboardControls, useTexture } from "@react-three/drei";
import * as THREE from "three";
import { derivePhysics, useActiveCar, useLab } from "../store/lab";

const controlsMap = [
  { name: "forward", keys: ["ArrowUp", "KeyW"] },
  { name: "back", keys: ["ArrowDown", "KeyS"] },
  { name: "left", keys: ["ArrowLeft", "KeyA"] },
  { name: "right", keys: ["ArrowRight", "KeyD"] },
  { name: "brake", keys: ["Space"] },
];

function TrackTile({
  url,
  position,
  rotation = [0, 0, 0],
  scale = 1,
  map,
}: {
  url: string;
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
  map: THREE.Texture;
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
  return <primitive object={cloned} position={position} rotation={rotation} scale={scale} />;
}

function OvalTrack() {
  const map = useTexture("/models/track/Textures/colormap.png");
  map.colorSpace = THREE.SRGBColorSpace;
  map.flipY = false;
  const s = 1.15;
  return (
    <group>
      <TrackTile map={map} url="/models/track/track-straight.glb" position={[0, 0, 10]} scale={s} />
      <TrackTile map={map} url="/models/track/track-straight.glb" position={[0, 0, 0]} scale={s} />
      <TrackTile map={map} url="/models/track/track-straight.glb" position={[0, 0, -10]} scale={s} />
      <TrackTile
        map={map}
        url="/models/track/track-corner.glb"
        position={[10, 0, -20]}
        rotation={[0, Math.PI / 2, 0]}
        scale={s}
      />
      <TrackTile
        map={map}
        url="/models/track/track-straight.glb"
        position={[20, 0, -10]}
        rotation={[0, Math.PI / 2, 0]}
        scale={s}
      />
      <TrackTile
        map={map}
        url="/models/track/track-straight.glb"
        position={[20, 0, 0]}
        rotation={[0, Math.PI / 2, 0]}
        scale={s}
      />
      <TrackTile
        map={map}
        url="/models/track/track-straight.glb"
        position={[20, 0, 10]}
        rotation={[0, Math.PI / 2, 0]}
        scale={s}
      />
      <TrackTile map={map} url="/models/track/track-corner.glb" position={[10, 0, 20]} rotation={[0, 0, 0]} scale={s} />
      <TrackTile
        map={map}
        url="/models/track/track-straight.glb"
        position={[0, 0, 20]}
        rotation={[0, Math.PI, 0]}
        scale={s}
      />
      <TrackTile
        map={map}
        url="/models/track/track-corner.glb"
        position={[-10, 0, 20]}
        rotation={[0, -Math.PI / 2, 0]}
        scale={s}
      />
      <TrackTile
        map={map}
        url="/models/track/track-straight.glb"
        position={[-20, 0, 10]}
        rotation={[0, Math.PI / 2, 0]}
        scale={s}
      />
      <TrackTile
        map={map}
        url="/models/track/track-straight.glb"
        position={[-20, 0, 0]}
        rotation={[0, Math.PI / 2, 0]}
        scale={s}
      />
      <TrackTile
        map={map}
        url="/models/track/track-straight.glb"
        position={[-20, 0, -10]}
        rotation={[0, Math.PI / 2, 0]}
        scale={s}
      />
      <TrackTile
        map={map}
        url="/models/track/track-corner.glb"
        position={[-10, 0, -20]}
        rotation={[0, Math.PI, 0]}
        scale={s}
      />
      <TrackTile map={map} url="/models/track/track-finish.glb" position={[0, 0.01, 5]} scale={s} />
      <TrackTile map={map} url="/models/track/decoration-tents.glb" position={[8, 0, -8]} scale={0.9} />
      <TrackTile map={map} url="/models/track/decoration-forest.glb" position={[-28, 0, 0]} scale={1.1} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[120, 120]} />
        <meshStandardMaterial color="#1a3a28" />
      </mesh>
    </group>
  );
}

function DriveCar() {
  const car = useActiveCar();
  const tuning = useLab((s) => s.tuning);
  const setTelemetry = useLab((s) => s.setTelemetry);
  const group = useRef<THREE.Group>(null);
  const { scene } = useGLTF(car.model);
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

  const state = useRef({
    x: 0,
    z: 8,
    yaw: 0,
    speed: 0,
    slip: 0,
    lapTime: 0,
    bestLap: 0,
    crossed: false,
  });

  const [, getKeys] = useKeyboardControls();

  useFrame((_, dt) => {
    const keys = getKeys();
    const phys = derivePhysics(tuning);
    const s = state.current;

    const throttle = keys.forward ? 1 : keys.back ? -0.45 : 0;
    const brake = keys.brake ? 1 : 0;
    const steerInput = (keys.left ? 1 : 0) - (keys.right ? 1 : 0);

    // Acceleration / braking
    if (brake) {
      s.speed -= Math.sign(s.speed || 1) * phys.brakeForce * dt;
      if (Math.abs(s.speed) < 0.4) s.speed = 0;
    } else {
      s.speed += throttle * phys.accel * dt;
    }

    // Drag + aero
    s.speed -= s.speed * phys.drag * 60 * dt;
    s.speed = THREE.MathUtils.clamp(s.speed, -phys.topSpeed * 0.35, phys.topSpeed);

    // Steering scales with speed; grip reduces slip
    const gripFactor = THREE.MathUtils.clamp(Math.abs(s.speed) / (phys.topSpeed + 0.01), 0, 1);
    const steer =
      steerInput * phys.turnRate * (0.35 + 0.65 * (1 - Math.min(gripFactor, 0.85))) * Math.sign(s.speed || 1);
    s.yaw += steer * dt * Math.min(1, Math.abs(s.speed) / 8);

    // Slip from aggressive turn at speed with low grip
    const desiredSlip = Math.abs(steerInput) * gripFactor * (1.2 - phys.grip);
    s.slip = THREE.MathUtils.lerp(s.slip, desiredSlip, 1 - Math.exp(-4 * dt));
    const drift = s.slip * 2.2;

    s.x += Math.sin(s.yaw) * s.speed * dt;
    s.z += Math.cos(s.yaw) * s.speed * dt;
    // Soft soft walls
    s.x = THREE.MathUtils.clamp(s.x, -34, 34);
    s.z = THREE.MathUtils.clamp(s.z, -34, 34);

    s.lapTime += dt;
    // Crude finish line on z~5, x near 0
    if (Math.abs(s.x) < 3 && s.z > 4 && s.z < 6 && s.speed > 2) {
      if (!s.crossed) {
        s.crossed = true;
        if (s.bestLap === 0 || s.lapTime < s.bestLap) s.bestLap = s.lapTime;
        s.lapTime = 0;
      }
    } else if (s.z < 2 || s.z > 8) {
      s.crossed = false;
    }

    if (group.current) {
      group.current.position.set(s.x, 0.05, s.z);
      group.current.rotation.y = s.yaw + Math.PI;
      group.current.rotation.z = -steerInput * 0.08 - drift * 0.04;
      group.current.rotation.x = -throttle * 0.03;
    }

    setTelemetry({
      speed: Math.abs(s.speed) * 3.6 * 0.55, // playful readout
      slip: s.slip,
      throttle: Math.max(0, throttle),
      brake,
      steer: steerInput,
      lapTime: s.lapTime,
      bestLap: s.bestLap,
    });
  });

  // chase cam via parent scene camera
  useFrame(({ camera }) => {
    const s = state.current;
    const back = 7.5;
    const height = 3.2;
    const tx = s.x - Math.sin(s.yaw) * back;
    const tz = s.z - Math.cos(s.yaw) * back;
    camera.position.lerp(new THREE.Vector3(tx, height, tz), 0.08);
    camera.lookAt(s.x, 0.8, s.z);
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
      <color attach="background" args={["#87b5d9"]} />
      <fog attach="fog" args={["#9ec5e8", 40, 110]} />
      <ambientLight intensity={0.55} />
      <directionalLight
        position={[20, 30, 10]}
        intensity={2.2}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <hemisphereLight args={["#cfe8ff", "#3d5c40", 0.45]} />
      <Suspense fallback={null}>
        <OvalTrack />
        <DriveCar />
      </Suspense>
    </>
  );
}

export function TrackCanvas() {
  const carId = useLab((s) => s.carId);
  useEffect(() => {
    useLab.getState().resetLap();
  }, [carId]);

  return (
    <KeyboardControls map={controlsMap}>
      <Canvas
        key={`track-${carId}`}
        shadows
        dpr={[1, 1.5]}
        camera={{ position: [0, 4, 14], fov: 55 }}
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
