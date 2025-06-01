// filepath: /Users/cdimascio/git/guitar-tuner-app/src/components/GuitarTunerGauge.tsx
import React from "react";
import "../index.css";

interface GuitarTunerGaugeProps {
  pitch: number | null;
  note: string | null;
}

const GuitarTunerGauge: React.FC<GuitarTunerGaugeProps> = ({ pitch, note }) => {
  return (
    <div className="guitar-tuner-gauge">
      <h2>Gauge</h2>
      <p>Pitch: {pitch?.toFixed(2) || "--"}</p>
      <p>Note: {note || "--"}</p>
    </div>
  );
};

export default GuitarTunerGauge;