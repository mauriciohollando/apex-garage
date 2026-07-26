import { NAV_LINKS } from "../lib/buildings";
import { useLab } from "../store/lab";

function formatTime(t: number) {
  if (!t) return "--:--.--";
  const m = Math.floor(t / 60);
  const s = (t % 60).toFixed(2).padStart(5, "0");
  return `${m}:${s}`;
}

export function Hud() {
  const telemetry = useLab((s) => s.telemetry);
  const nearbyBuilding = useLab((s) => s.nearbyBuilding);
  const dismissBuildingMenu = useLab((s) => s.dismissBuildingMenu);

  return (
    <div className="hud">
      <nav className="site-nav" aria-label="Portfolio">
        {NAV_LINKS.map((link) => (
          <a
            key={link.label}
            href={link.href}
            className={"current" in link && link.current ? "active" : undefined}
            target="_top"
            rel={"current" in link && link.current ? undefined : "noopener noreferrer"}
          >
            {link.label}
          </a>
        ))}
      </nav>

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

      {nearbyBuilding && (
        <div className="building-menu" role="dialog" aria-label={nearbyBuilding.name}>
          <header>
            <div>
              <em>{nearbyBuilding.tagline}</em>
              <h3>{nearbyBuilding.name}</h3>
            </div>
          </header>
          <div className="building-tags">
            {nearbyBuilding.tags.map((t) => (
              <span key={t}>{t}</span>
            ))}
          </div>
          <p>{nearbyBuilding.description}</p>
          <div className="building-stack">
            {nearbyBuilding.stack.map((s) => (
              <span key={s}>{s}</span>
            ))}
          </div>
          <div className="building-actions">
            <a className="primary" href={nearbyBuilding.href} target="_blank" rel="noopener noreferrer">
              {nearbyBuilding.hrefLabel}
            </a>
            <button type="button" onClick={dismissBuildingMenu}>
              Close
            </button>
          </div>
        </div>
      )}

      <div className="help">
        Drive to a building to open a project · WASD / arrows · S or Space brake then reverse · R respawn
      </div>
    </div>
  );
}
