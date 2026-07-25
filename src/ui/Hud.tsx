import { CARS, TUNING_META } from "../lib/cars";
import { computeRadar, useActiveCar, useLab } from "../store/lab";

function formatTime(t: number) {
  if (!t) return "--:--.--";
  const m = Math.floor(t / 60);
  const s = (t % 60).toFixed(2).padStart(5, "0");
  return `${m}:${s}`;
}

export function Hud() {
  const mode = useLab((s) => s.mode);
  const setMode = useLab((s) => s.setMode);
  const carId = useLab((s) => s.carId);
  const selectCar = useLab((s) => s.selectCar);
  const tuning = useLab((s) => s.tuning);
  const setTune = useLab((s) => s.setTune);
  const resetTune = useLab((s) => s.resetTune);
  const telemetry = useLab((s) => s.telemetry);
  const car = useActiveCar();
  const radar = computeRadar(tuning);

  return (
    <div className="hud">
      <div className="brand">
        <h1>APEX GARAGE</h1>
        <span>Car Tuning Lab · Proof of Concept</span>
      </div>

      <div className="mode-switch">
        <button className={mode === "garage" ? "active" : ""} onClick={() => setMode("garage")}>
          Garage
        </button>
        <button className={mode === "track" ? "active" : ""} onClick={() => setMode("track")}>
          Test Track
        </button>
      </div>

      <div className="credit">
        Models CC0 by Kenney.nl
        <br />
        Inspired by CSR Racing + marque configurators
      </div>

      {mode === "garage" && (
        <>
          <div className="car-rail">
            {CARS.map((c) => (
              <button
                key={c.id}
                className={`car-chip ${c.id === carId ? "active" : ""}`}
                onClick={() => selectCar(c.id)}
              >
                <strong>{c.name}</strong>
                <em>{c.class}</em>
              </button>
            ))}
          </div>

          <div className="hero-copy">
            <div className="class">{car.class}</div>
            <h2>{car.name}</h2>
            <p>{car.tagline}</p>
          </div>
        </>
      )}

      <aside className="tune-panel">
        <header>
          <h3>Tune</h3>
          <button onClick={resetTune}>Reset</button>
        </header>
        {TUNING_META.map((row) => (
          <div className="slider-row" key={row.key} title={row.hint}>
            <label htmlFor={row.key}>{row.label}</label>
            <input
              id={row.key}
              type="range"
              min={0}
              max={100}
              value={tuning[row.key]}
              onChange={(e) => setTune(row.key, Number(e.target.value))}
            />
            <output>{tuning[row.key]}</output>
          </div>
        ))}
        <div className="radar">
          <div className="stat">
            <span>Speed</span>
            <strong>{Math.round(radar.speed)}</strong>
          </div>
          <div className="stat">
            <span>Accel</span>
            <strong>{Math.round(radar.accel)}</strong>
          </div>
          <div className="stat">
            <span>Grip</span>
            <strong>{Math.round(radar.handling)}</strong>
          </div>
        </div>
      </aside>

      {mode === "track" && (
        <>
          <div className="drive-hud">
            <div className="gauge">
              <div className="label">Speed</div>
              <div className="value">{Math.round(telemetry.speed)}</div>
              <div className="unit">km/h</div>
            </div>
            <div className="gauge">
              <div className="label">Lap</div>
              <div className="value" style={{ fontSize: "1.8rem" }}>
                {formatTime(telemetry.lapTime)}
              </div>
              <div className="unit">best {formatTime(telemetry.bestLap)}</div>
            </div>
            <div className="gauge">
              <div className="label">Lat G</div>
              <div className="value">{Math.abs(telemetry.lateralG).toFixed(1)}</div>
              <div className="unit">
                long {telemetry.longG >= 0 ? "+" : ""}
                {telemetry.longG.toFixed(1)}
              </div>
            </div>
            <div className="gauge">
              <div className="label">Slip</div>
              <div className="value">{Math.round(telemetry.slip * 100)}</div>
              <div className="unit">%</div>
            </div>
            <div className="gauge">
              <div className="label">Trap</div>
              <div className="value" style={{ fontSize: "1.8rem" }}>
                {telemetry.trapSpeed ? Math.round(telemetry.trapSpeed) : "--"}
              </div>
              <div className="unit">best {telemetry.bestTrap ? Math.round(telemetry.bestTrap) : "--"}</div>
            </div>
          </div>
          <div className="zone-pill">{telemetry.zone}</div>
          <div className="help">
            WASD / arrows to drive · Space to brake · R to respawn. Engine → trap speed · Tires → skidpad grip · Aero →
            high-speed stability.
          </div>
        </>
      )}
    </div>
  );
}
