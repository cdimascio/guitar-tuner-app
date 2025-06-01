// filepath: /Users/cdimascio/git/guitar-tuner-app/src/components/GuitarTunerGauge.tsx
import React, { useEffect, useState } from "react";
import { YIN } from "pitchfinder";
import "../index.css";

const audioContext = new ((window as any).AudioContext || (window as any).webkitAudioContext)();
const analyser = audioContext.createAnalyser();
const pitchDetector = YIN();

const GuitarTunerGauge: React.FC = () => {
  const [detectedPitch, setDetectedPitch] = useState<number | null>(null);
  const [detectedNote, setDetectedNote] = useState<string | null>(null);
  const [offset, setOffset] = useState<number | null>(null);

  useEffect(() => {
    const getMicrophoneAccess = async () => {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      const data = new Float32Array(analyser.fftSize);

      const detectPitch = () => {
        analyser.getFloatTimeDomainData(data);
        const pitch = pitchDetector(data); // Fixed argument issue
        if (pitch) {
          setDetectedPitch(pitch);
          const note = calculateNoteFromPitch(pitch);
          setDetectedNote(note.name);
          setOffset(note.offset);
        }
        requestAnimationFrame(detectPitch);
      };

      detectPitch();
    };

    getMicrophoneAccess();
  }, []);

  const calculateNoteFromPitch = (pitch: number) => {
    const noteFrequencies = [
      27.5, 29.14, 30.87, 32.7, 34.65, 36.71, 38.89, 41.2, 43.65, 46.25, 49.0, 51.91, // Octave 0
      55.0, 58.27, 61.74, 65.41, 69.3, 73.42, 77.78, 82.41, 87.31, 92.5, 98.0, 103.83, // Octave 1
      110.0, 116.54, 123.47, 130.81, 138.59, 146.83, 155.56, 164.81, 174.61, 185.0, 196.0, 207.65, // Octave 2
      220.0, 233.08, 246.94, 261.63, 277.18, 293.66, 311.13, 329.63, 349.23, 369.99, 392.0, 415.3, // Octave 3
      440.0, 466.16, 493.88, 523.25, 554.37, 587.33, 622.25, 659.25, 698.46, 739.99, 783.99, 830.61, // Octave 4
      880.0, 932.33, 987.77, 1046.5, 1108.73, 1174.66, 1244.51, 1318.51, 1396.91, 1479.98, 1567.98, 1661.22, // Octave 5
      1760.0, 1864.66, 1975.53, 2093.0, 2217.46, 2349.32, 2489.02, 2637.02, 2793.83, 2959.96, 3135.96, 3322.44, // Octave 6
      3520.0, 3729.31, 3951.07, 4186.01 // Octave 7
    ];

    const noteNames = [
      "A", "A#", "B", "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#"
    ];

    let closestIndex = 0;
    let minDifference = Infinity;

    for (let i = 0; i < noteFrequencies.length; i++) {
      const difference = Math.abs(noteFrequencies[i] - pitch);
      if (difference < minDifference) {
        minDifference = difference;
        closestIndex = i;
      }
    }

    const noteName = noteNames[closestIndex % 12];
    const octave = Math.floor(closestIndex / 12);
    const offset = pitch - noteFrequencies[closestIndex];

    return { name: `${noteName}${octave}`, offset };
  };

  return (
    <div className="guitar-tuner-gauge">
      <h2>Gauge</h2>
      <p>Pitch: {detectedPitch?.toFixed(2) || "--"}</p>
      <p>Note: {detectedNote || "--"}</p>
      <p>Offset: {offset?.toFixed(2) || "--"} Hz</p>
    </div>
  );
};

export default GuitarTunerGauge;