// filepath: /Users/cdimascio/git/guitar-tuner-app/src/components/GuitarTunerGauge.tsx
import React from "react";
import "./GuitarTuner.css";

interface GuitarTunerGaugeProps {
  pitch: number | null;
  note: string | null;
}

const GuitarTunerGauge: React.FC<GuitarTunerGaugeProps> = ({ pitch, note }) => {
  const calculateRotation = () => {
    if (pitch === null) return 0;

    const noteFrequencies = [
      82.41, 110.0, 146.83, 196.0, 246.94, 329.63, // E2, A2, D3, G3, B3, E4
    ];

    let closestIndex = 0;
    let smallestDifference = Math.abs(pitch - noteFrequencies[0]);

    for (let i = 1; i < noteFrequencies.length; i++) {
      const difference = Math.abs(pitch - noteFrequencies[i]);
      if (difference < smallestDifference) {
        smallestDifference = difference;
        closestIndex = i;
      }
    }

    const offset = pitch - noteFrequencies[closestIndex];
    const maxRotation = 45; // Maximum rotation in degrees
    const clampedOffset = Math.max(-50, Math.min(50, offset)); // Clamp offset to [-50, 50] Hz
    return (clampedOffset / 50) * maxRotation; // Map offset to rotation
  };

  const rotation = calculateRotation();

  return (
    <div className="guitar-tuner-widget">
      <div className="dial" style={{ transform: `rotate(${rotation}deg)` }}></div>
      <div className="gauge">
        <span className="indicator">|</span>
        <span className="label">Flat</span>
        <span className="label">On Pitch</span>
        <span className="label">Sharp</span>
      </div>
      <div className="note-display">Note: {note || "--"}</div>
    </div>
  );
};

export default GuitarTunerGauge;