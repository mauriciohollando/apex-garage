export type BuildingDef = {
  id: string;
  name: string;
  tagline: string;
  blurb: string;
  actions: { id: string; label: string; hint: string }[];
  model: string;
  position: [number, number, number];
  rotationY: number;
  scale: number;
  /** Distance at which the proximity menu opens */
  radius: number;
};

export const BUILDINGS: BuildingDef[] = [
  {
    id: "pit-shop",
    name: "Pit Shop",
    tagline: "Quick service · Parts wall",
    blurb: "Swap brake pads, grab stickers, and argue about tire compounds with the pit crew.",
    actions: [
      { id: "service", label: "Request service", hint: "Reset ballast feel for the next lap" },
      { id: "parts", label: "Browse parts", hint: "Cosmetic shelf — coming soon" },
    ],
    model: "/models/buildings/building-type-a.glb",
    position: [-18, 0, 28],
    rotationY: Math.PI / 2,
    scale: 9,
    radius: 20,
  },
  {
    id: "nitro-cafe",
    name: "Nitro Café",
    tagline: "Espresso · Timing sheets",
    blurb: "Where drivers post trap speeds on the whiteboard and pretend the coffee is fuel.",
    actions: [
      { id: "board", label: "Check leaderboard", hint: "Best trap from this session" },
      { id: "coffee", label: "Order a shot", hint: "Morale +1 (decorative)" },
    ],
    model: "/models/buildings/building-type-d.glb",
    position: [-18, 0, 88],
    rotationY: Math.PI / 2,
    scale: 9,
    radius: 20,
  },
  {
    id: "grip-lab",
    name: "Grip Lab",
    tagline: "Skidpad · Tire science",
    blurb: "Engineers watch slip angles from the balcony while you cook the skidpad circle.",
    actions: [
      { id: "tires", label: "Tire briefing", hint: "Tips for lateral grip tuning" },
      { id: "data", label: "Pull data", hint: "Session telemetry snapshot" },
    ],
    model: "/models/buildings/building-type-h.glb",
    position: [68, 0, 28],
    rotationY: -Math.PI / 2,
    scale: 9,
    radius: 20,
  },
  {
    id: "clubhouse",
    name: "Clubhouse",
    tagline: "Lounge · Race control",
    blurb: "Race control, lounge chairs, and the only working radio that can call you in.",
    actions: [
      { id: "control", label: "Talk to control", hint: "Respawn tips and circuit notes" },
      { id: "lounge", label: "Take a break", hint: "Sit this one out (decorative)" },
    ],
    model: "/models/buildings/building-type-t.glb",
    position: [21, 0, -26],
    rotationY: 0,
    scale: 9,
    radius: 20,
  },
];

export function nearestBuilding(x: number, z: number): BuildingDef | null {
  let best: BuildingDef | null = null;
  let bestD = Infinity;
  for (const b of BUILDINGS) {
    const dx = x - b.position[0];
    const dz = z - b.position[2];
    const d = Math.hypot(dx, dz);
    if (d < b.radius && d < bestD) {
      best = b;
      bestD = d;
    }
  }
  return best;
}
