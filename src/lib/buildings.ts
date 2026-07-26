export type ProjectBuilding = {
  id: string;
  name: string;
  tagline: string;
  description: string;
  tags: string[];
  stack: string[];
  href: string;
  hrefLabel: string;
  model: string;
  position: [number, number, number];
  rotationY: number;
  scale: number;
  /** Distance at which the proximity menu opens */
  radius: number;
};

/** Portfolio solo projects — one building each around the circuit. */
export const BUILDINGS: ProjectBuilding[] = [
  {
    id: "console-lab",
    name: "Console Lab",
    tagline: "Interactive chipset museum & hardware bench",
    description:
      "A hands-on museum of console silicon. Seat historical CPUs, GPUs and media chips into a socketed motherboard, snap modules into controller shells, and watch which software features become legal as capability tags, power budgets and bus limits collide. A 16k-card collector catalog of machines, silicon, controllers and games sits alongside the bench, and any exhibit can be opened up as a researched PCB.",
    tags: ["Lab", "Hardware Sim", "Monorepo"],
    stack: ["Next.js 15", "React 19", "TypeScript", "Zustand", "Zod", "Vercel"],
    href: "https://console-lab.vercel.app/catalog",
    hrefLabel: "Visit project",
    model: "/models/buildings/building-type-a.glb",
    position: [-18, 0, 28],
    rotationY: Math.PI / 2,
    scale: 9,
    radius: 20,
  },
  {
    id: "escalation-room",
    name: "Escalation Room",
    tagline: "Geopolitical command simulation · escalationroom.com",
    description:
      "A multiplayer command theater. Players take a national desk, negotiate a crisis scenario with an AI producer, then run it — either in synchronized 24-hour turns or as continuous operations with real preparation lead times, asset locks and intelligence windows. Every match generates its own countries, ORBAT, map tokens, news wire and after-action reports.",
    tags: ["Multiplayer", "LLM Sim", "Live"],
    stack: ["Next.js 15", "Postgres", "Supabase Auth", "OpenAI GPT-4o", "Stripe", "Vercel"],
    href: "https://escalationroom.com",
    hrefLabel: "Visit project",
    model: "/models/buildings/building-type-d.glb",
    position: [-18, 0, 88],
    rotationY: Math.PI / 2,
    scale: 9,
    radius: 20,
  },
  {
    id: "rfpcheck",
    name: "RFP Check",
    tagline: "AI go / no-go for public RFPs · rfpcheck.com",
    description:
      "Upload a U.S. public construction solicitation and get a one-page GO / CAUTION / NO-GO stoplight report — deadlines, bonding, liquidated damages, diversity goals, licensing and trade scope — before burning takeoff hours. Deliberately not a bid board: it answers whether this specific PDF is worth estimating.",
    tags: ["AI", "SaaS", "Construction", "Live"],
    stack: ["Next.js 15", "OpenAI", "Neon Postgres", "Supabase Auth", "Stripe", "Vercel"],
    href: "https://rfpcheck.com",
    hrefLabel: "Visit project",
    model: "/models/buildings/building-type-h.glb",
    position: [68, 0, 28],
    rotationY: -Math.PI / 2,
    scale: 9,
    radius: 20,
  },
  {
    id: "choreocraft",
    name: "ChoreoCraft",
    tagline: "Feel-good choreography playground · Steam",
    description:
      "Pick a song, stage a cast, and build a routine move by move — then publish it, remix someone else's, and keep evolving your style. Free to play on Steam, backed by a cloud catalog of songs, stages, characters and community choreographies.",
    tags: ["Steam", "Unity", "UGC", "Free to Play"],
    stack: ["Unity 6", "C#", "Firebase", "Steamworks.NET", "Addressables"],
    href: "https://store.steampowered.com/app/4323050/ChoreoCraft/",
    hrefLabel: "Visit project",
    model: "/models/buildings/building-type-t.glb",
    position: [21, 0, -26],
    rotationY: 0,
    scale: 9,
    radius: 20,
  },
];

export function nearestBuilding(x: number, z: number): ProjectBuilding | null {
  let best: ProjectBuilding | null = null;
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

/** Portfolio site origin for top-right nav */
export const PORTFOLIO_ORIGIN = "https://mauriciohollando.com";

export const NAV_LINKS = [
  { label: "Home", href: `${PORTFOLIO_ORIGIN}/home` },
  { label: "CV", href: `${PORTFOLIO_ORIGIN}/cv` },
  { label: "Projects", href: `${PORTFOLIO_ORIGIN}/projects`, current: true },
  { label: "Skills", href: `${PORTFOLIO_ORIGIN}/skills` },
] as const;
