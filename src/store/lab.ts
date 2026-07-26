import { create } from "zustand";
import { CARS, type TuningKey, type TuningState } from "../lib/cars";
import { computeRadarFromTuning } from "../lib/vehiclePhysics";
import type { BuildingDef } from "../lib/buildings";

export type AppMode = "garage" | "track";

export type Telemetry = {
  speed: number;
  slip: number;
  throttle: number;
  brake: number;
  steer: number;
  lapTime: number;
  bestLap: number;
  lateralG: number;
  longG: number;
  trapSpeed: number;
  bestTrap: number;
  zone: string;
};

type Store = {
  mode: AppMode;
  carId: string;
  tuning: TuningState;
  telemetry: Telemetry;
  nearbyBuilding: BuildingDef | null;
  buildingToast: string | null;
  dismissedBuildingId: string | null;
  setMode: (mode: AppMode) => void;
  selectCar: (id: string) => void;
  setTune: (key: TuningKey, value: number) => void;
  resetTune: () => void;
  setTelemetry: (partial: Partial<Telemetry>) => void;
  resetLap: () => void;
  setNearbyBuilding: (building: BuildingDef | null) => void;
  dismissBuildingMenu: () => void;
  runBuildingAction: (actionId: string) => void;
  clearBuildingToast: () => void;
};

function baseFor(carId: string): TuningState {
  const car = CARS.find((c) => c.id === carId) ?? CARS[0];
  return { ...car.base };
}

const emptyTel: Telemetry = {
  speed: 0,
  slip: 0,
  throttle: 0,
  brake: 0,
  steer: 0,
  lapTime: 0,
  bestLap: 0,
  lateralG: 0,
  longG: 0,
  trapSpeed: 0,
  bestTrap: 0,
  zone: "Pits",
};

export const useLab = create<Store>((set, get) => ({
  mode: "garage",
  carId: CARS[0].id,
  tuning: baseFor(CARS[0].id),
  telemetry: { ...emptyTel },
  nearbyBuilding: null,
  buildingToast: null,
  dismissedBuildingId: null,
  setMode: (mode) => set({ mode, nearbyBuilding: null, buildingToast: null, dismissedBuildingId: null }),
  selectCar: (id) => set({ carId: id, tuning: baseFor(id) }),
  setTune: (key, value) =>
    set({ tuning: { ...get().tuning, [key]: Math.max(0, Math.min(100, value)) } }),
  resetTune: () => set({ tuning: baseFor(get().carId) }),
  setTelemetry: (partial) => set({ telemetry: { ...get().telemetry, ...partial } }),
  resetLap: () =>
    set({
      telemetry: {
        ...get().telemetry,
        lapTime: 0,
        trapSpeed: 0,
      },
    }),
  setNearbyBuilding: (building) => {
    const { nearbyBuilding: cur, dismissedBuildingId } = get();
    if (!building) {
      if (cur !== null || dismissedBuildingId !== null) {
        set({ nearbyBuilding: null, buildingToast: null, dismissedBuildingId: null });
      }
      return;
    }
    if (dismissedBuildingId === building.id) {
      if (cur !== null) set({ nearbyBuilding: null });
      return;
    }
    if (cur?.id === building.id) return;
    set({ nearbyBuilding: building, buildingToast: null });
  },
  dismissBuildingMenu: () => {
    const b = get().nearbyBuilding;
    set({ nearbyBuilding: null, buildingToast: null, dismissedBuildingId: b?.id ?? null });
  },
  runBuildingAction: (actionId) => {
    const b = get().nearbyBuilding;
    if (!b) return;
    const action = b.actions.find((a) => a.id === actionId);
    if (!action) return;
    if (actionId === "service") {
      const t = get().tuning;
      set({ tuning: { ...t, weight: Math.max(20, t.weight - 4) }, buildingToast: action.hint });
      return;
    }
    if (actionId === "board") {
      const best = get().telemetry.bestTrap;
      set({
        buildingToast: best
          ? `Session best trap: ${Math.round(best)} km/h`
          : "No trap runs yet — hit the north straight.",
      });
      return;
    }
    if (actionId === "tires") {
      set({ buildingToast: "Raise Tires for skidpad grip; softer Suspension helps turn-in." });
      return;
    }
    if (actionId === "data") {
      const tel = get().telemetry;
      set({
        buildingToast: `Now ${Math.round(tel.speed)} km/h · slip ${Math.round(tel.slip * 100)}% · lat ${Math.abs(tel.lateralG).toFixed(1)} G`,
      });
      return;
    }
    if (actionId === "control") {
      set({ buildingToast: "Circuit runs clockwise. R respawns. Knock the crate piles for fun." });
      return;
    }
    set({ buildingToast: action.hint });
  },
  clearBuildingToast: () => set({ buildingToast: null }),
}));

export function useActiveCar() {
  const carId = useLab((s) => s.carId);
  return CARS.find((c) => c.id === carId) ?? CARS[0];
}

/** @deprecated kept for garage radar — prefer computeRadarFromTuning */
export function derivePhysics(tuning: TuningState) {
  return computeRadarFromTuning(tuning);
}

export function computeRadar(tuning: TuningState) {
  return computeRadarFromTuning(tuning);
}
