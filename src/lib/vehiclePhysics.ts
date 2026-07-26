import type { TuningState } from "./cars";

export const FIXED_DT = 1 / 120;
export const MAX_SUBSTEPS = 8;

export type VehicleInput = {
  throttle: number;
  brake: number;
  steer: number;
};

export type VehicleState = {
  x: number;
  z: number;
  yaw: number;
  vx: number;
  vy: number;
  yawRate: number;
  slipFront: number;
  slipRear: number;
  slipMag: number;
  ax: number;
  ay: number;
  loadFront: number;
  loadRear: number;
  rpm: number;
  gear: number;
};

export type CarSetup = {
  mass: number;
  wheelbase: number;
  cgToFront: number;
  cgToRear: number;
  cgHeight: number;
  driveForce: number;
  brakeForce: number;
  brakeBias: number;
  maxSteer: number;
  peakMu: number;
  corneringStiffness: number;
  shapeFactor: number;
  dragCoeff: number;
  downforce: number;
  rollResist: number;
  yawInertia: number;
};

export function setupFromTuning(tuning: TuningState): CarSetup {
  const mass = 1180 + tuning.weight * 4.2;
  const wheelbase = 2.55;
  let cgToFront = 1.2 + (tuning.weight - 50) * 0.002;
  cgToFront = Math.max(1.05, Math.min(1.5, cgToFront));
  const cgToRear = wheelbase - cgToFront;
  const cgHeight = 0.48 + (100 - tuning.suspension) * 0.0012;

  return {
    mass,
    wheelbase,
    cgToFront,
    cgToRear,
    cgHeight,
    peakMu: 0.85 + tuning.grip * 0.0085,
    corneringStiffness: 8 + tuning.grip * 0.09 + tuning.suspension * 0.04,
    shapeFactor: 1.35 + tuning.suspension * 0.004,
    driveForce: 5200 + tuning.power * 78,
    brakeForce: 9000 + tuning.brakes * 95,
    brakeBias: Math.max(0.42, Math.min(0.72, 0.55 + (tuning.brakes - 50) * 0.0025)),
    maxSteer: ((32 - tuning.aero * 0.04) * Math.PI) / 180,
    dragCoeff: 0.32 + tuning.aero * 0.0028,
    downforce: tuning.aero * 18,
    rollResist: 0.015,
    yawInertia: mass * 1.35,
  };
}

export function pacejkaLat(slipAngle: number, load: number, setup: CarSetup): number {
  const D = setup.peakMu * load;
  return D * Math.sin(setup.shapeFactor * Math.atan(setup.corneringStiffness * slipAngle));
}

export function createVehicleState(spawn?: Partial<VehicleState>): VehicleState {
  return {
    x: spawn?.x ?? 0,
    z: spawn?.z ?? 14,
    yaw: spawn?.yaw ?? 0,
    vx: 0,
    vy: 0,
    yawRate: 0,
    slipFront: 0,
    slipRear: 0,
    slipMag: 0,
    ax: 0,
    ay: 0,
    loadFront: 0.5,
    loadRear: 0.5,
    rpm: 900,
    gear: 1,
  };
}

export function stepVehicle(s: VehicleState, input: VehicleInput, setup: CarSetup, dt: number): void {
  const g = 9.81;
  const speed = Math.hypot(s.vx, s.vy);
  const steerScale = 1 / (1 + speed * speed * 0.0028);
  const steer = input.steer * setup.maxSteer * steerScale;

  const aeroLoad = setup.downforce * speed * speed * 0.004;
  const staticFront = (setup.mass * g * setup.cgToRear) / setup.wheelbase;
  const staticRear = (setup.mass * g * setup.cgToFront) / setup.wheelbase;
  const transfer = (setup.mass * s.ax * setup.cgHeight) / setup.wheelbase;

  let loadF = Math.max(200, staticFront - transfer + aeroLoad * 0.4);
  let loadR = Math.max(200, staticRear + transfer + aeroLoad * 0.6);
  const totalLoad = loadF + loadR;
  s.loadFront = loadF / totalLoad;
  s.loadRear = loadR / totalLoad;

  const eps = 0.85;
  const vxSafe = Math.abs(s.vx) < eps ? eps * Math.sign(s.vx || 1) : s.vx;
  const slipF = Math.atan2(s.vy + setup.cgToFront * s.yawRate, vxSafe) - steer;
  const slipR = Math.atan2(s.vy - setup.cgToRear * s.yawRate, vxSafe);
  // Below walking pace slip angles are numerically meaningless, so fade tires in
  const slipGate = Math.max(0, Math.min(1, (speed - 0.6) / 2.5));
  s.slipFront = slipF;
  s.slipRear = slipR;
  s.slipMag = Math.min(1.4, (Math.abs(slipF) + Math.abs(slipR)) * 0.55) * slipGate;

  // Lateral tire forces (body frame; front rotated by steer)
  const FyF_tire = -pacejkaLat(slipF, loadF, setup) * slipGate;
  const FyR_tire = -pacejkaLat(slipR, loadR, setup) * slipGate;

  const cosD = Math.cos(steer);
  const sinD = Math.sin(steer);

  // Longitudinal
  const brakeDir = s.vx >= -0.05 ? -1 : 1;
  const FxEngine = Math.max(0, input.throttle) * setup.driveForce;
  const FxReverse = Math.min(0, input.throttle) * setup.driveForce * 1.26;
  const FxBrakeF = input.brake * setup.brakeForce * setup.brakeBias * brakeDir;
  const FxBrakeR = input.brake * setup.brakeForce * (1 - setup.brakeBias) * brakeDir;
  // Resistive forces must vanish at rest or they jitter the car back and forth
  const rolling = Math.abs(s.vx) > 0.2 ? Math.sign(s.vx) : 0;
  const FxDrag = setup.dragCoeff * speed * speed * rolling;
  const FxRoll = setup.rollResist * setup.mass * g * rolling;

  // Front tire frame → body frame
  const FxF_body = FxBrakeF * cosD - FyF_tire * sinD;
  const FyF_body = FxBrakeF * sinD + FyF_tire * cosD;
  const FxR_body = FxEngine + FxReverse + FxBrakeR;
  const FyR_body = FyR_tire;

  const FxTotal = FxF_body + FxR_body - FxDrag - FxRoll;
  const FyTotal = FyF_body + FyR_body;

  const ax = FxTotal / setup.mass;
  const ay = FyTotal / setup.mass;
  s.ax = ax;
  s.ay = ay;

  const yawTorque = setup.cgToFront * FyF_body - setup.cgToRear * FyR_body + setup.cgToFront * FxBrakeF * sinD;
  // Yaw damping keeps the rear from oscillating at the limit
  const yawDamp = -s.yawRate * setup.yawInertia * 0.9;
  s.yawRate += ((yawTorque + yawDamp) / setup.yawInertia) * dt;
  s.yawRate = Math.max(-2.6, Math.min(2.6, s.yawRate));

  // Rotating-reference-frame terms: without these the car never settles into a turn
  s.vx += (ax + s.vy * s.yawRate) * dt;
  s.vy += (ay - s.vx * s.yawRate) * dt;

  if (speed < 0.4 && input.throttle === 0) {
    s.vx *= 0.9;
    s.vy *= 0.85;
    s.yawRate *= 0.85;
  }

  // Body forward is +Z in local space, so world forward = (sin yaw, cos yaw)
  const cosY = Math.cos(s.yaw);
  const sinY = Math.sin(s.yaw);
  s.x += (sinY * s.vx + cosY * s.vy) * dt;
  s.z += (cosY * s.vx - sinY * s.vy) * dt;
  s.yaw += s.yawRate * dt;

  s.x = Math.max(-90, Math.min(110, s.x));
  s.z = Math.max(-60, Math.min(130, s.z));

  const wheelSpeed = Math.abs(s.vx) * 3.6;
  s.gear = wheelSpeed < 40 ? 1 : wheelSpeed < 80 ? 2 : wheelSpeed < 130 ? 3 : wheelSpeed < 180 ? 4 : 5;
  const gearRatio = [0, 3.2, 2.1, 1.5, 1.15, 0.9][s.gear];
  const targetRpm = 900 + Math.abs(s.vx) * gearRatio * 85 + Math.max(0, input.throttle) * 1800;
  s.rpm += (targetRpm - s.rpm) * Math.min(1, dt * 6);
}

export function computeRadarFromTuning(tuning: TuningState) {
  const setup = setupFromTuning(tuning);
  const topSpeedEst = Math.sqrt(setup.driveForce / Math.max(0.15, setup.dragCoeff * 12));
  const accelEst = setup.driveForce / setup.mass;
  return {
    speed: Math.max(0, Math.min(100, (topSpeedEst / 55) * 100)),
    accel: Math.max(0, Math.min(100, (accelEst / 8) * 100)),
    handling: Math.max(0, Math.min(100, setup.peakMu * 85 + tuning.suspension * 0.15)),
    brakes: Math.max(0, Math.min(100, setup.brakeForce / 160)),
    aero: tuning.aero,
    grip: tuning.grip,
  };
}
