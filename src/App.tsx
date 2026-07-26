import { TrackCanvas } from "./components/TrackCanvas";
import { Hud } from "./ui/Hud";
import "./styles.css";

export default function App() {
  return (
    <div className="app-shell">
      <TrackCanvas />
      <Hud />
    </div>
  );
}
