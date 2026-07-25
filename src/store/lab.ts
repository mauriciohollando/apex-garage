import { create } from "zustand";
import { CARS, type TuningKey, type TuningState } from "../lib/cars";

export type AppMode = "garage" | "track";

type Telemetry = {
  speed: number;
  slip: number;
  throttle: number;
  brake: number;
  steer: number;
  lapTime: number;
  bestLap: number;
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

export const useLab = create<Store>((set, get) => ({
  mode: "garage",
  carId: CARS[0].id,
  tuning: baseFor(CARS[0].id),
  telemetry: {
    speed: 0,
    slip: 0,
    throttle: 0,
    brake: 0,
    steer: 0,
    lapTime: 0,
    bestLap: 0,
  },
  setMode: (mode) => set({ mode }),
  selectCar: (id) => set({ carId: id, tuning: baseFor(id) }),
  setTune: (key, value) =>
    set({ tuning: { ...get().tuning, [key]: Math.max(0, Math.min(100, value)) } }),
  resetTune: () => set({ tuning: baseFor(get().carId) }),
  setTelemetry: (partial) =>
    set({ telemetry: { ...get().telemetry, ...partial } }),
  resetLap: () => set({ telemetry: { ...get().telemetry, lapTime: 0 } }),
}));

export function useActiveCar() {
  const carId = useLab((s) => s.carId);
  return CARS.find((c) => c.id === carId) ?? CARS[0];
}

/** Derived handling model from CSR-style 0–100 sliders */
export function derivePhysics(tuning: TuningState) {
  const power = 0.55 + tuning.power / 100;
  const grip = 0.45 + tuning.grip / 110;
  const suspension = 0.5 + tuning.suspension / 140;
  const aero = tuning.aero / 100;
  const brakes = 0.5 + tuning.brakes / 100;
  const weight = 1.15 - tuning.weight / 220;

  const topSpeed = (38 + tuning.power * 0.42 + aero * 8) * weight;
  const accel = (18 + tuning.power * 0.28) * grip * weight;
  const turnRate = (1.4 + grip * 1.6 + suspension * 0.8 - aero * 0.15) * weight;
  const drag = 0.012 + aero * 0.01 + tuning.weight * 0.00008;
  const brakeForce = 28 * brakes;

  return { topSpeed, accel, turnRate, drag, brakeForce, grip, suspension };
}

export function computeRadar(tuning: TuningState) {
  const p = derivePhysics(tuning);
  return {
    speed: Math.min(100, (p.topSpeed / 90) * 100),
    accel: Math.min(100, (p.accel / 45) * 100),
    handling: Math.min(100, (p.turnRate / 4.2) * 100),
    brakes: Math.min(100, (p.brakeForce / 55) * 100),
    aero: tuning.aero,
    grip: tuning.grip,
  };
}
