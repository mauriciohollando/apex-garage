import { GarageCanvas } from "./components/GarageCanvas";
import { TrackCanvas } from "./components/TrackCanvas";
import { useLab } from "./store/lab";
import { Hud } from "./ui/Hud";
import "./styles.css";

export default function App() {
  const mode = useLab((s) => s.mode);

  return (
    <div className="app-shell">
      {mode === "garage" ? <GarageCanvas /> : <TrackCanvas />}
      <Hud />
    </div>
  );
}
