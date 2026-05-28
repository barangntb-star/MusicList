/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState } from "react";
import { LyricsData, Song } from "../types.js";
import { Languages, HelpCircle, BookOpen, Music, AlertCircle, RefreshCw } from "lucide-react";

interface LyricsPanelProps {
  song: Song | null;
  lyrics: LyricsData | null;
  currentTime: number;
  onSeek: (seconds: number) => void;
  isLoading: boolean;
  onRefreshLyrics: () => void;
}

export default function LyricsPanel({
  song,
  lyrics,
  currentTime,
  onSeek,
  isLoading,
  onRefreshLyrics
}: LyricsPanelProps) {
  const [showTranslation, setShowTranslation] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const activeLineRef = useRef<HTMLButtonElement | null>(null);

  // Find active line index based on current playback second
  const findActiveLineIndex = (): number => {
    if (!lyrics || !lyrics.syncedLyrics || lyrics.syncedLyrics.length === 0) return -1;
    
    let activeIdx = -1;
    for (let i = 0; i < lyrics.syncedLyrics.length; i++) {
      if (currentTime >= lyrics.syncedLyrics[i].time) {
        activeIdx = i;
      } else {
        break;
      }
    }
    return activeIdx;
  };

  const activeIndex = findActiveLineIndex();

  // Smooth-scroll active lyric into view center
  useEffect(() => {
    if (activeLineRef.current) {
      activeLineRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center"
      });
    }
  }, [activeIndex]);

  // Reset translation toggle when song changes
  useEffect(() => {
    setShowTranslation(false);
  }, [song]);

  if (!song) {
    return (
      <div id="lyrics-panel-empty" className="flex flex-col items-center justify-center p-8 bg-zinc-900/60 rounded-2xl border border-zinc-800 text-zinc-500 min-h-[160px] md:min-h-[220px]">
        <Music className="w-8 h-8 text-zinc-700 mb-2 animate-bounce" />
        <p className="text-xs font-mono uppercase tracking-wider text-zinc-500">Karaoke / Lirik</p>
        <p className="text-[10px] text-zinc-650 mt-1 text-center max-w-xs">Putar lagu apa pun dari daftar untuk mensinkronisasi lirik berjalan secara real-time di sini.</p>
      </div>
    );
  }

  return (
    <div id="lyrics-panel-main" className="flex flex-col h-full bg-zinc-900/60 rounded-2xl border border-zinc-800 p-4 relative">
      
      {/* Mini Title bar */}
      <div className="flex justify-between items-center pb-3 border-b border-zinc-800/80 mb-3 shrink-0">
        <div className="min-w-0">
          <span className="text-[10px] font-mono uppercase text-emerald-400 font-semibold tracking-wider flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            SINKRONISASI LIRIK AKTIF
          </span>
          <h3 className="text-xs font-bold text-zinc-200 truncate mt-0.5">{song.title} — Lirik Pintar</h3>
        </div>

        {/* Translation Toggle Trigger */}
        {lyrics && lyrics.translationAvailable && lyrics.translation && (
          <button
            id="btn-toggle-translation"
            onClick={() => setShowTranslation(!showTranslation)}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-mono uppercase transition-all border cursor-pointer ${
              showTranslation
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                : "bg-zinc-950/80 border-zinc-800 text-zinc-400 hover:text-zinc-200"
            }`}
            title="Terjemahkan Lirik ke Indonesia"
          >
            <Languages className="w-3.5 h-3.5" />
            {showTranslation ? "INDONESIA Y" : "TERJEMAHKAN"}
          </button>
        )}
      </div>

      {/* Offline Fallback Alert Bar when Gemini rate limited */}
      {lyrics && lyrics.isOfflineFallback && (
        <div id="lyrics-offline-banner" className="mb-3 p-2 bg-amber-500/5 border border-amber-500/20 rounded-xl flex items-start gap-2 shrink-0">
          <AlertCircle className="w-3.5 h-3.5 text-amber-500 animate-pulse shrink-0 mt-0.5" />
          <span className="text-[9px] text-amber-400 font-sans leading-normal">
            <strong>Mode Cadangan Aktif:</strong> Batas kapasitas respon server terlampaui. Menyajikan lirik adaptif estetik dari database lokal instan agar alur musik Anda tetap mengalir lancar.
          </span>
        </div>
      )}

      {isLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center py-16 gap-3 text-zinc-500">
          <RefreshCw className="w-6 h-6 text-emerald-400 animate-spin" />
          <p className="text-[10px] font-mono tracking-wider uppercase text-zinc-400">Merangkai lirik berjalan...</p>
        </div>
      ) : !lyrics ? (
        <div className="flex-1 flex flex-col items-center justify-center py-12 text-zinc-500">
          <AlertCircle className="w-6 h-6 text-rose-400 opacity-80 mb-2" />
          <p className="text-[10px] font-mono uppercase text-rose-300">Gagal Memuat Lirik</p>
          <button
            id="btn-retry-lyrics"
            onClick={onRefreshLyrics}
            className="mt-2 px-2.5 py-1.5 bg-zinc-800 text-zinc-200 text-xs rounded-lg hover:text-white cursor-pointer"
          >
            Coba Lagi
          </button>
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-h-0 space-y-4">
          
          {/* Synchronized Scrolling Lyrics area */}
          <div
            id="lyrics-scroll-box"
            ref={containerRef}
            className="flex-1 overflow-y-auto max-h-[180px] md:max-h-[280px] space-y-4 py-8 px-2 relative scroll-smooth no-scrollbar select-none rounded-xl bg-zinc-950/20 shadow-inner"
          >
            {lyrics.syncedLyrics.map((line, idx) => {
              const isActive = idx === activeIndex;
              return (
                <button
                  id={`lyric-line-${idx}`}
                  key={idx}
                  ref={isActive ? activeLineRef : null}
                  onClick={() => onSeek(line.time)}
                  className={`w-full text-left font-sans text-xs py-1 px-2 rounded-lg transition-all duration-300 transform outline-none cursor-pointer hover:bg-zinc-800/20 ${
                    isActive
                      ? "text-white font-bold opacity-100 scale-102 bg-zinc-800/10"
                      : "text-zinc-600 opacity-40 scale-100 hover:opacity-75"
                  }`}
                  style={{
                    textShadow: isActive ? "0 0 10px rgba(255,255,255,0.15)" : "none"
                  }}
                >
                  <div className="flex items-start gap-2.5">
                    <span className="text-[9px] font-mono opacity-5w text-zinc-650 shrink-0 mt-0.5">
                      {Math.floor(line.time / 60)}:{(line.time % 60).toString().padStart(2, '0')}
                    </span>
                    <span className="break-words">
                      {/* Decide whether to show translation based on toggle state */}
                      {showTranslation && lyrics.translation && !line.text.startsWith("🎵") && !line.text.startsWith("🏎️") && !line.text.startsWith("💧")
                        ? (getTranslationLine(line.text, idx, lyrics.translation) || line.text)
                        : line.text}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Meaning Insight Box (Gemini powered) */}
          <div id="lyrics-meaning-box" className="p-3 bg-zinc-950/80 border border-zinc-800 rounded-xl flex gap-2.5 shrink-0 align-top transition-all duration-300">
            <BookOpen className="w-5 h-5 text-amber-400 shrink-0 mt-0.5 animate-pulse" />
            <div className="min-w-0">
              <h4 className="text-[10px] font-mono uppercase text-zinc-500 tracking-wider flex items-center justify-between">
                <span>Makna & Sajak Lagu</span>
                <span className="text-[8px] bg-zinc-900 px-1 py-0.5 rounded text-zinc-650 font-normal capitalize">
                  {lyrics.isOfflineFallback ? "Database Cadangan" : "Powered by Gemini"}
                </span>
              </h4>
              <p className="text-[10px] leading-relaxed text-zinc-400 mt-1 italic">
                "{lyrics.meaning}"
              </p>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}

// Simple logic to parse and match translation line indices if they are structured lines
function getTranslationLine(originalText: string, index: number, fullTranslation: string): string | null {
  try {
    const lines = fullTranslation.split('\n').filter(l => l.trim() !== "");
    // Try to retrieve corresponding line element or match lines gracefully
    if (lines[index]) {
      return lines[index].replace(/^\[Bait \d+\]|^\[Reff\]/, "").trim();
    }
    // Search match in translation text
    return null;
  } catch {
    return null;
  }
}
