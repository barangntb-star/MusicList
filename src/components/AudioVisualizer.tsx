/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState } from "react";
import { Sparkles, Activity } from "lucide-react";

interface AudioVisualizerProps {
  analyser: AnalyserNode | null;
  isPlaying: boolean;
  accentColor?: string;
}

export default function AudioVisualizer({ analyser, isPlaying, accentColor = "#6366f1" }: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const [visualMode, setVisualMode] = useState<'bars' | 'wave'>('bars');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Handle high-DPI scaling
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const bufferLength = analyser ? analyser.frequencyBinCount : 64;
    const dataArray = new Uint8Array(bufferLength);

    const render = () => {
      const width = rect.width;
      const height = rect.height;

      // Draw dark futuristic background
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = "rgba(15, 15, 20, 0.15)";
      ctx.fillRect(0, 0, width, height);

      if (analyser && isPlaying) {
        if (visualMode === 'bars') {
          analyser.getByteFrequencyData(dataArray);
          
          const barWidth = (width / (bufferLength * 0.7)) * 1.5;
          let barHeight;
          let x = 0;

          for (let i = 0; i < bufferLength * 0.7; i++) {
            barHeight = (dataArray[i] / 255) * height * 0.9;
            
            // Build gradient accents
            const grad = ctx.createLinearGradient(0, height, 0, height - barHeight);
            grad.addColorStop(0, "rgba(99, 102, 241, 0.15)"); // soft purple base
            grad.addColorStop(0.5, accentColor);               // dynamic accent
            grad.addColorStop(1, "#38bdf8");                  // bright sky peak

            ctx.fillStyle = grad;
            
            // Render rounded bars
            ctx.beginPath();
            if (ctx.roundRect) {
              ctx.roundRect(x, height - barHeight - 2, barWidth - 2, barHeight + 2, 4);
              ctx.fill();
            } else {
              ctx.fillRect(x, height - barHeight, barWidth - 2, barHeight);
            }
            
            x += barWidth;
          }
        } else {
          // Oscilloscope Waveform Mode
          analyser.getByteTimeDomainData(dataArray);
          
          ctx.lineWidth = 2.5;
          ctx.strokeStyle = accentColor;
          ctx.beginPath();

          const sliceWidth = width / bufferLength;
          let x = 0;

          for (let i = 0; i < bufferLength; i++) {
            const v = dataArray[i] / 128.0;
            const y = (v * height) / 2;

            if (i === 0) {
              ctx.moveTo(x, y);
            } else {
              ctx.lineTo(x, y);
            }

            x += sliceWidth;
          }

          ctx.lineTo(width, height / 2);
          
          // Outer neon glow shadow
          ctx.shadowBlur = 10;
          ctx.shadowColor = accentColor;
          ctx.stroke();
          ctx.shadowBlur = 0; // reset
        }
      } else {
        // Idle Animation state when not playing to maintain a living aesthetic
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
        ctx.beginPath();
        const segments = 40;
        const sliceWidth = width / segments;
        for (let i = 0; i <= segments; i++) {
          const t = Date.now() * 0.003 + i * 0.2;
          const y = height / 2 + Math.sin(t) * (isPlaying ? 15 : 4);
          if (i === 0) ctx.moveTo(0, y);
          else ctx.lineTo(i * sliceWidth, y);
        }
        ctx.stroke();
      }

      animationRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [analyser, isPlaying, visualMode, accentColor]);

  // Adjust canvas size on window resize
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div id="audio-visualizer-container" className="relative w-full h-24 bg-zinc-950/80 rounded-xl overflow-hidden border border-zinc-800/80 p-2 flex flex-col justify-between">
      <canvas id="audio-visualizer-canvas" ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
      
      {/* Controls Overlay */}
      <div className="relative z-10 flex justify-between items-center w-full mt-auto">
        <span className="text-[10px] font-mono text-zinc-500 tracking-wider flex items-center gap-1">
          {isPlaying ? (
            <>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              PROSEDURAL SYNTH AKTIF
            </>
          ) : (
            "SINTESIS INAKTIF"
          )}
        </span>
        
        <div className="flex bg-zinc-900/90 rounded-lg p-0.5 border border-zinc-800">
          <button
            id="vmode-bars-btn"
            onClick={() => setVisualMode('bars')}
            className={`p-1 rounded-md text-xs transition-colors cursor-pointer ${visualMode === 'bars' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
            title="Daftar Bar Equalizer"
          >
            <Sparkles className="w-3 w-3" />
          </button>
          <button
            id="vmode-wave-btn"
            onClick={() => setVisualMode('wave')}
            className={`p-1 rounded-md text-xs transition-colors cursor-pointer ${visualMode === 'wave' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
            title="Sinyal Waveform"
          >
            <Activity className="w-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
