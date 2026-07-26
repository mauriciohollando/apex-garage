import { create } from "zustand";
import { CARS, type TuningState } from "../lib/cars";
import type { ProjectBuilding } from "../lib/buildings";

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
  carId: string;
  tuning: TuningState;
  telemetry: Telemetry;
  nearbyBuilding: ProjectBuilding | null;
  dismissedBuildingId: string | null;
  setTelemetry: (partial: Partial<Telemetry>) => void;
  resetLap: () => void;
  setNearbyBuilding: (building: ProjectBuilding | null) => void;
  dismissBuildingMenu: () => void;
};

const CROWN = CARS.find((c) => c.id === "crown-v8") ?? CARS[0];

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
  zone: "Circuit",
};

export const useLab = create<Store>((set, get) => ({
  carId: CROWN.id,
  tuning: { ...CROWN.base },
  telemetry: { ...emptyTel },
  nearbyBuilding: null,
  dismissedBuildingId: null,
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
        set({ nearbyBuilding: null, dismissedBuildingId: null });
      }
      return;
    }
    if (dismissedBuildingId === building.id) {
      if (cur !== null) set({ nearbyBuilding: null });
      return;
    }
    if (cur?.id === building.id) return;
    set({ nearbyBuilding: building });
  },
  dismissBuildingMenu: () => {
    const b = get().nearbyBuilding;
    set({ nearbyBuilding: null, dismissedBuildingId: b?.id ?? null });
  },
}));

export function useActiveCar() {
  const carId = useLab((s) => s.carId);
  return CARS.find((c) => c.id === carId) ?? CROWN;
}
