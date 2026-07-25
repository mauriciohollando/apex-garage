import { CARS } from "../src/lib/cars";
import { createVehicleState, setupFromTuning, stepVehicle, FIXED_DT } from "../src/lib/vehiclePhysics";

const setup = setupFromTuning(CARS[0].base);

function run(label: string, input: { throttle: number; brake: number; steer: number }, seconds: number) {
  const v = createVehicleState({ x: 0, z: 0, yaw: 0 });
  const steps = Math.round(seconds / FIXED_DT);
  for (let i = 0; i < steps; i++) stepVehicle(v, input, setup, FIXED_DT);
  console.log(
    `${label.padEnd(22)} x=${v.x.toFixed(2).padStart(7)} z=${v.z.toFixed(2).padStart(7)} ` +
      `yaw=${((v.yaw * 180) / Math.PI).toFixed(1).padStart(7)}deg ` +
      `vx=${v.vx.toFixed(2).padStart(6)} vy=${v.vy.toFixed(2).padStart(6)} ` +
      `kmh=${(Math.hypot(v.vx, v.vy) * 3.6).toFixed(1)}`,
  );
}

run("throttle straight 3s", { throttle: 1, brake: 0, steer: 0 }, 3);
run("throttle+left 3s", { throttle: 1, brake: 0, steer: 1 }, 3);
run("throttle+right 3s", { throttle: 1, brake: 0, steer: -1 }, 3);
run("reverse 2s", { throttle: -1, brake: 0, steer: 0 }, 2);
run("coast then brake", { throttle: 0, brake: 1, steer: 0 }, 2);

// Step-steer at speed: yaw rate should converge, not ring or diverge
const v = createVehicleState({ x: 0, z: 0, yaw: 0 });
v.vx = 30;
const trace: number[] = [];
for (let i = 0; i < Math.round(4 / FIXED_DT); i++) {
  stepVehicle(v, { throttle: 0.35, brake: 0, steer: 0.5 }, setup, FIXED_DT);
  if (i % Math.round(0.25 / FIXED_DT) === 0) trace.push(v.yawRate);
}
console.log("\nstep steer @108kmh, yaw rate every 0.25s:");
console.log(trace.map((r) => r.toFixed(3)).join(" "));
console.log(`steady radius = ${(v.vx / v.yawRate).toFixed(1)} m, lat g = ${((v.vx * v.yawRate) / 9.81).toFixed(2)}`);
