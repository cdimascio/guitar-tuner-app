// src/components/GuitarTuner.tsx
import React, { useEffect, useRef, useState } from "react";
import GuitarTunerGauge from "./GuitarTunerGauge";
import "../index.css";
import { YIN } from "pitchfinder";

// Updated to handle all notes, not just guitar-specific notes
const getNoteFromPitch = (pitch: number): string => {
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
  let smallestDifference = Math.abs(pitch - noteFrequencies[0]);

  for (let i = 1; i < noteFrequencies.length; i++) {
    const difference = Math.abs(pitch - noteFrequencies[i]);
    if (difference < smallestDifference) {
      smallestDifference = difference;
      closestIndex = i;
    }
  }

  const noteName = noteNames[closestIndex % 12];
  const octave = Math.floor(closestIndex / 12);
  return `${noteName}${octave}`;
};

const instrumentRanges = {
  guitar: [82.41, 329.63], // E2 to E4
  bass: [41.2, 98.0], // E1 to G2
};

const filterPitchForInstrument = (pitch: number, instrument: "guitar" | "bass"): boolean => {
  const [minRange, maxRange] = instrumentRanges[instrument];
  return pitch >= minRange && pitch <= maxRange;
};

const pitchDetector = YIN();

const GuitarTuner: React.FC = () => {
  const [pitch, setPitch] = useState<number | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [instrument, setInstrument] = useState<"guitar" | "bass">("guitar");
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    const startTuning = async () => {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContextRef.current = new AudioContext({ sampleRate: 44100 });
      const source = audioContextRef.current.createMediaStreamSource(stream);
      const analyser = audioContextRef.current.createAnalyser();
      analyser.fftSize = 8192; // Further increase FFT size for better resolution
      source.connect(analyser);

      const bandPassFilter = audioContextRef.current.createBiquadFilter();
      bandPassFilter.type = "bandpass";
      bandPassFilter.frequency.setTargetAtTime(329.63, audioContextRef.current.currentTime, 0.01); // Center frequency for E4
      bandPassFilter.Q.setTargetAtTime(15, audioContextRef.current.currentTime, 0.01); // Sharpen focus further
      const gainNode = audioContextRef.current.createGain();
      gainNode.gain.value = 7; // Increase gain for better high E detection
      source.connect(gainNode);
      gainNode.connect(bandPassFilter);
      bandPassFilter.connect(analyser);

      const buffer = new Float32Array(analyser.fftSize);

      const isHighE = (frequency: number) => frequency >= 320 && frequency <= 340; // Adjusted range for high E string (E4)

      const noiseGateThreshold = 0.01; // Threshold for noise gate

      const applyNoiseGate = (buffer: Float32Array) => {
        for (let i = 0; i < buffer.length; i++) {
          if (Math.abs(buffer[i]) < noiseGateThreshold) {
            buffer[i] = 0; // Suppress noise below the threshold
          }
        }
      };

      const prioritizeE4 = (frequency: number) => {
        const targetFrequency = 329.63; // E4
        const tolerance = 5; // Allowable deviation in Hz
        return Math.abs(frequency - targetFrequency) <= tolerance;
      };

      const smoothFrequency = (frequency: number, previousFrequency: number | null): number => {
        const smoothingFactor = 0.8; // Adjust smoothing factor (0 = no smoothing, 1 = full smoothing)
        return previousFrequency
          ? smoothingFactor * previousFrequency + (1 - smoothingFactor) * frequency
          : frequency;
      };

      const scoreFrequency = (frequency: number): number => {
        const targetFrequency = 329.63; // E4
        const harmonicTolerance = 10; // Tolerance for harmonics
        const distance = Math.abs(frequency - targetFrequency);

        // Penalize frequencies further from E4 and harmonics like E2 and A2
        if (frequency < targetFrequency / 2 || frequency > targetFrequency * 2) {
          return 0; // Ignore frequencies outside the harmonic range
        }

        return Math.max(0, 1 - distance / harmonicTolerance); // Score closer frequencies higher
      };

      let previousFrequency: number | null = null;
      let lockedFrequency: number | null = null;
      let lockTimeout: ReturnType<typeof setTimeout> | null = null;

      const lockFrequency = (frequency: number) => {
        lockedFrequency = frequency;
        if (lockTimeout) clearTimeout(lockTimeout);
        lockTimeout = setTimeout(() => {
          lockedFrequency = null; // Unlock after 2 seconds
        }, 2000);
      };

      const detectPitch = () => {
        analyser.getFloatTimeDomainData(buffer);
        applyNoiseGate(buffer); // Apply noise gate to reduce interference
        const detectedPitch = pitchDetector(buffer); // Corrected to pass only one argument
        if (detectedPitch) {
          const smoothedPitch = smoothFrequency(detectedPitch, previousFrequency);
          previousFrequency = smoothedPitch; // Update previous frequency

          // If frequency is locked, prioritize it
          if (lockedFrequency && Math.abs(smoothedPitch - lockedFrequency) < 5) {
            setPitch(lockedFrequency);
            const detectedNote = getNoteFromPitch(lockedFrequency);
            setNote(detectedNote);
          } else {
            // Score the detected pitch and prioritize E4
            const score = scoreFrequency(smoothedPitch);
            if (
              score > 0.5 && // Only consider frequencies with a high enough score
              filterPitchForInstrument(smoothedPitch, instrument) &&
              (instrument !== "guitar" || prioritizeE4(smoothedPitch)) // Prioritize E4 for high E string
            ) {
              setPitch(smoothedPitch);
              const detectedNote = getNoteFromPitch(smoothedPitch);
              setNote(detectedNote);
              lockFrequency(smoothedPitch); // Lock onto the detected frequency
            }
          }
        }
        requestAnimationFrame(detectPitch);
      };

      detectPitch();
    };

    startTuning();
  }, [instrument]);

  return (
    <div className="guitar-tuner">
      <h1>Instrument Tuner</h1>
      <label>
        Select Instrument:
        <select value={instrument} onChange={(e) => setInstrument(e.target.value as "guitar" | "bass")}>
          <option value="guitar">Guitar</option>
          <option value="bass">Bass</option>
        </select>
      </label>
      <div>Pitch: {pitch?.toFixed(2) || "--"} Hz</div>
      <div>Note: {note || "--"}</div>

      <GuitarTunerGauge pitch={pitch} note={note} />
    </div>
  );
};

export default GuitarTuner;