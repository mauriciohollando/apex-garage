import { create } from "zustand";
import { CARS, type TuningKey, type TuningState } from "../lib/cars";
import { computeRadarFromTuning } from "../lib/vehiclePhysics";

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
  setMode: (mode: AppMode) => void;
  selectCar: (id: string) => void;
  setTune: (key: TuningKey, value: number) => void;
  resetTune: () => void;
  setTelemetry: (partial: Partial<Telemetry>) => void;
  resetLap: () => void;
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
  setMode: (mode) => set({ mode }),
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
