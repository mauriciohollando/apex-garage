import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, Environment, OrbitControls, useGLTF, useTexture } from "@react-three/drei";
import * as THREE from "three";
import { useActiveCar, useLab } from "../store/lab";

function CarModel({ url, scale }: { url: string; scale: number }) {
  const { scene } = useGLTF(url);
  const map = useTexture("/models/cars/Textures/colormap.png");
  map.colorSpace = THREE.SRGBColorSpace;
  map.flipY = false;

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
        mat.metalness = 0.35;
        mat.roughness = 0.42;
        mat.envMapIntensity = 1.15;
        mat.needsUpdate = true;
      });
    });
    return root;
  }, [scene, map]);

  return <primitive object={cloned} scale={scale} position={[0, 0, 0]} rotation={[0, Math.PI * 0.85, 0]} />;
}

function SlowSpin({ children }: { children: React.ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.22;
  });
  return <group ref={ref}>{children}</group>;
}

function GarageRoom() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[10, 64]} />
        <meshStandardMaterial color="#12151c" metalness={0.65} roughness={0.35} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]}>
        <ringGeometry args={[3.15, 3.3, 64]} />
        <meshStandardMaterial color="#e11d2e" emissive="#e11d2e" emissiveIntensity={1.1} />
      </mesh>
      <mesh position={[0, 4.5, -8]}>
        <boxGeometry args={[30, 10, 0.4]} />
        <meshStandardMaterial color="#0d1016" />
      </mesh>
      <mesh position={[-9, 4.5, 0]}>
        <boxGeometry args={[0.4, 10, 18]} />
        <meshStandardMaterial color="#0d1016" />
      </mesh>
      <mesh position={[9, 4.5, 0]}>
        <boxGeometry args={[0.4, 10, 18]} />
        <meshStandardMaterial color="#0d1016" />
      </mesh>
      {[-3.8, 0, 3.8].map((x) => (
        <group key={x} position={[x, 5.35, -1.2]}>
          <mesh>
            <boxGeometry args={[2.8, 0.1, 0.5]} />
            <meshStandardMaterial color="#ffffff" emissive="#ffe7b5" emissiveIntensity={2.2} />
          </mesh>
          <spotLight position={[0, -0.15, 0]} angle={0.75} penumbra={0.55} intensity={42} color="#fff1d4" castShadow />
        </group>
      ))}
      <mesh position={[-8.7, 1.7, 0]}>
        <boxGeometry args={[0.08, 2.8, 9]} />
        <meshStandardMaterial color="#e11d2e" emissive="#e11d2e" emissiveIntensity={2.4} />
      </mesh>
      <mesh position={[8.7, 1.7, 0]}>
        <boxGeometry args={[0.08, 2.8, 9]} />
        <meshStandardMaterial color="#f5c542" emissive="#f5c542" emissiveIntensity={1.6} />
      </mesh>
    </group>
  );
}

function GarageStage() {
  const car = useActiveCar();
  return (
    <>
      <color attach="background" args={["#07080b"]} />
      <fog attach="fog" args={["#07080b", 16, 30]} />
      <ambientLight intensity={0.45} />
      <directionalLight position={[6, 10, 4]} intensity={2.4} castShadow color="#fff6e8" />
      <pointLight position={[-3, 3, 4]} intensity={28} color="#e11d2e" />
      <pointLight position={[4, 2.8, 3]} intensity={20} color="#4fd1c5" />
      <GarageRoom />
      <SlowSpin>
        <Suspense fallback={null}>
          <CarModel url={car.model} scale={car.scale} />
        </Suspense>
      </SlowSpin>
      <ContactShadows position={[0, 0.02, 0]} opacity={0.7} scale={11} blur={2.4} far={7} />
      <Environment preset="city" environmentIntensity={0.4} />
      <OrbitControls
        enablePan={false}
        minPolarAngle={0.75}
        maxPolarAngle={1.45}
        minDistance={4.2}
        maxDistance={10}
        target={[0, 0.55, 0]}
      />
    </>
  );
}

export function GarageCanvas() {
  const carId = useLab((s) => s.carId);
  // Clear drei GLTF cache when switching cars so materials refresh cleanly
  useEffect(() => {
    return () => undefined;
  }, [carId]);

  return (
    <Canvas
      key={carId}
      shadows
      dpr={[1, 1.75]}
      camera={{ position: [4.8, 2.35, 5.8], fov: 40, near: 0.1, far: 80 }}
      gl={{
        antialias: true,
        alpha: false,
        toneMapping: THREE.ACESFilmicToneMapping,
        preserveDrawingBuffer: true,
      }}
      style={{ width: "100%", height: "100%" }}
    >
      <GarageStage />
    </Canvas>
  );
}

[
  "/models/cars/sedan-sports.glb",
  "/models/cars/hatchback-sports.glb",
  "/models/cars/race.glb",
  "/models/cars/race-future.glb",
  "/models/cars/suv-luxury.glb",
].forEach((u) => useGLTF.preload(u));
