// src/components/GuitarTuner.tsx
import React, { useEffect, useRef, useState } from "react";
import GuitarTunerGauge from "./GuitarTunerGauge";
import "../index.css";

// basic pitch detection using autocorrelation
const autoCorrelate = (buf: Float32Array, sampleRate: number): number => {
  let SIZE = buf.length;
  let MAX_SAMPLES = Math.floor(SIZE / 2);
  let bestOffset = -1;
  let bestCorrelation = 0;
  let rms = 0;
  let foundGoodCorrelation = false;
  let correlations = new Array(MAX_SAMPLES);

  for (let i = 0; i < SIZE; i++) {
    let val = buf[i];
    rms += val * val;
  }
  rms = Math.sqrt(rms / SIZE);

  if (rms < 0.01) return -1; // Not enough signal

  let lastCorrelation = 1;
  for (let offset = 0; offset < MAX_SAMPLES; offset++) {
    let correlation = 0;

    for (let i = 0; i < MAX_SAMPLES; i++) {
      correlation += Math.abs(buf[i] - buf[i + offset]);
    }
    correlation = 1 - (correlation / MAX_SAMPLES);
    correlations[offset] = correlation;

    if (correlation > 0.9 && correlation > lastCorrelation) {
      foundGoodCorrelation = true;
      if (correlation > bestCorrelation) {
        bestCorrelation = correlation;
        bestOffset = offset;
      }
    } else if (foundGoodCorrelation) {
      let shift = (correlations[bestOffset + 1] - correlations[bestOffset - 1]) / correlations[bestOffset];
      return sampleRate / (bestOffset + (8 * shift));
    }
    lastCorrelation = correlation;
  }

  if (bestCorrelation > 0.01) {
    return sampleRate / bestOffset;
  }
  return -1;
};

// Function to map pitch to note
const getNoteFromPitch = (pitch: number): string => {
  const noteFrequencies = [
    82.41, 110.0, 146.83, 196.0, 246.94, 329.63, // E2, A2, D3, G3, B3, E4
  ];
  const noteNames = ["E", "A", "D", "G", "B", "E"];

  let closestIndex = 0;
  let smallestDifference = Math.abs(pitch - noteFrequencies[0]);

  for (let i = 1; i < noteFrequencies.length; i++) {
    const difference = Math.abs(pitch - noteFrequencies[i]);
    if (difference < smallestDifference) {
      smallestDifference = difference;
      closestIndex = i;
    }
  }

  return noteNames[closestIndex];
};

const GuitarTuner: React.FC = () => {
  const [pitch, setPitch] = useState<number | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    const startTuning = async () => {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContextRef.current = new AudioContext();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      const analyser = audioContextRef.current.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);

      const buffer = new Float32Array(analyser.fftSize);

      const detectPitch = () => {
        analyser.getFloatTimeDomainData(buffer);
        const detectedPitch = autoCorrelate(buffer, audioContextRef.current!.sampleRate);
        if (detectedPitch) {
          setPitch(detectedPitch);
          const detectedNote = getNoteFromPitch(detectedPitch);
          setNote(detectedNote);
        }
        requestAnimationFrame(detectPitch);
      };

      detectPitch();
    };

    startTuning();
  }, []);

  return (
    <div className="guitar-tuner">
      <h1>Guitar Tuner</h1>
      <div>Pitch: {pitch?.toFixed(2) || "--"} Hz</div>
      <div>Note: {note || "--"}</div>

      <GuitarTunerGauge pitch={pitch} note={note} />
    </div>
  );
};

export default GuitarTuner;