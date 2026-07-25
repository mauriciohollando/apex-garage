export type TuningKey =
  | "power"
  | "grip"
  | "suspension"
  | "aero"
  | "brakes"
  | "weight";

export type TuningState = Record<TuningKey, number>;

export type CarDef = {
  id: string;
  name: string;
  class: string;
  tagline: string;
  model: string;
  scale: number;
  yOffset: number;
  color: string;
  accent: string;
  base: TuningState;
  stats: { topSpeed: number; accel: number; handling: number };
};

export const CARS: CarDef[] = [
  {
    id: "apex-rs",
    name: "Apex RS",
    class: "Sports Coupe",
    tagline: "Street-legal aggression",
    model: "/models/cars/sedan-sports.glb",
    scale: 1.15,
    yOffset: 0,
    color: "#c41e2a",
    accent: "#f5c542",
    base: { power: 55, grip: 50, suspension: 45, aero: 40, brakes: 50, weight: 48 },
    stats: { topSpeed: 72, accel: 68, handling: 70 },
  },
  {
    id: "pulse-gt",
    name: "Pulse GT",
    class: "Hot Hatch",
    tagline: "Corners first, excuses later",
    model: "/models/cars/hatchback-sports.glb",
    scale: 1.15,
    yOffset: 0,
    color: "#1f6feb",
    accent: "#7dd3fc",
    base: { power: 48, grip: 62, suspension: 55, aero: 35, brakes: 58, weight: 42 },
    stats: { topSpeed: 64, accel: 74, handling: 82 },
  },
  {
    id: "vector-one",
    name: "Vector One",
    class: "Prototype",
    tagline: "Track weapon, road manners optional",
    model: "/models/cars/race.glb",
    scale: 1.2,
    yOffset: 0,
    color: "#f5c542",
    accent: "#111111",
    base: { power: 78, grip: 70, suspension: 68, aero: 75, brakes: 72, weight: 35 },
    stats: { topSpeed: 88, accel: 86, handling: 84 },
  },
  {
    id: "nova-x",
    name: "Nova X",
    class: "Concept",
    tagline: "Tomorrow's grip, today's garage",
    model: "/models/cars/race-future.glb",
    scale: 1.15,
    yOffset: 0,
    color: "#a855f7",
    accent: "#22d3ee",
    base: { power: 82, grip: 74, suspension: 60, aero: 80, brakes: 70, weight: 30 },
    stats: { topSpeed: 92, accel: 90, handling: 78 },
  },
  {
    id: "crown-v8",
    name: "Crown V8",
    class: "Luxury Muscle",
    tagline: "Torque for days",
    model: "/models/cars/suv-luxury.glb",
    scale: 1.05,
    yOffset: 0,
    color: "#e8e4dc",
    accent: "#c41e2a",
    base: { power: 70, grip: 45, suspension: 40, aero: 28, brakes: 48, weight: 70 },
    stats: { topSpeed: 70, accel: 62, handling: 52 },
  },
];

export const TUNING_META: {
  key: TuningKey;
  label: string;
  unit: string;
  hint: string;
}[] = [
  { key: "power", label: "Engine", unit: "HP+", hint: "Peak thrust and launch" },
  { key: "grip", label: "Tires", unit: "μ", hint: "Lateral grip and traction" },
  { key: "suspension", label: "Suspension", unit: "Hz", hint: "Body control in corners" },
  { key: "aero", label: "Aero", unit: "kgf", hint: "Downforce vs drag trade" },
  { key: "brakes", label: "Brakes", unit: "%", hint: "Stopping power and bias" },
  { key: "weight", label: "Ballast", unit: "kg", hint: "Mass vs agility" },
];
