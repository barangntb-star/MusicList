/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Song } from "../types.js";

// Helper map to translate popular chord names into frequencies
// Range: Bass (root notes) and Triad/7th harmony voices
const CHORD_NOTES: Record<string, number[]> = {
  "C": [130.81, 164.81, 196.00],      // C3, E3, G3
  "Cmaj7": [130.81, 164.81, 196.00, 246.94], // C3, E3, G3, B3
  "Am": [110.00, 130.81, 164.81],      // A2, C3, E3
  "Am7": [110.00, 130.81, 164.81, 196.00], // A2, C3, E3, G3
  "F": [87.31, 130.81, 174.61],        // F2, C3, F3
  "Fmaj7": [87.31, 130.81, 174.61, 220.00], // F2, C3, F3, A3
  "G": [98.00, 146.83, 196.00],        // G2, D3, G3
  "G7": [98.00, 146.83, 196.00, 220.00],  // G2, D3, G3, B3 (approx)
  "Em": [82.41, 130.81, 164.81],       // E2, C3, E3 (harmonized)
  "Em7": [82.41, 110.00, 130.81, 164.81], // E2, G2, B2, D3
  "Dm": [146.83, 174.61, 220.00],      // D3, F3, A3
  "Dm7": [146.83, 174.61, 220.00, 261.63], // D3, F3, A3, C4
  "Bm": [116.54, 146.83, 220.00],      // B2, D3, F#3 (approx)
  "D": [146.83, 185.00, 220.00],       // D3, F#3, A3
  "A": [110.00, 138.59, 164.81],       // A2, C#3, E3
  "E": [82.41, 123.47, 164.81],        // E2, B2, E3
  "Bb": [116.54, 146.83, 174.61]       // Bb2, D3, F3
};

export class AudioSynthManager {
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private masterVol: GainNode | null = null;
  
  private song: Song | null = null;
  private isPlaying: boolean = false;
  private bpm: number = 80;
  private chordProgression: string[] = ["C", "Am", "F", "G"];
  private instrumentStyle: string = "ambient";
  private currentChordIndex: number = 0;
  
  private schedulerTimer: any = null;
  private nextNoteTime: number = 0.0;
  private beatCounter: number = 0;
  private isMuted: boolean = false;
  private volumeLevel: number = 0.5; // 0.0 to 1.0

  private audioElement: HTMLAudioElement | null = null;
  private audioSourceNode: MediaElementAudioSourceNode | null = null;

  public onTimeUpdate: (progressSeconds: number) => void = () => {};
  public onBeatTrigger: (beatNum: number) => void = () => {};

  constructor() {
    // AudioContext handles lazy initialization on first interactive gesture
  }

  private initCtx() {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioContextClass();
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 128;
      
      this.masterVol = this.ctx.createGain();
      this.masterVol.gain.value = this.volumeLevel;
      
      this.analyser.connect(this.masterVol);
      this.masterVol.connect(this.ctx.destination);
    }
    
    // Set up audioElement and connect to analyser if not done already
    if (!this.audioElement) {
      this.audioElement = new Audio();
      this.audioElement.crossOrigin = "anonymous";
    }

    if (!this.audioSourceNode && this.audioElement && this.ctx && this.analyser) {
      try {
        this.audioSourceNode = this.ctx.createMediaElementSource(this.audioElement);
        this.audioSourceNode.connect(this.analyser);
      } catch (err) {
        console.error("Failed to connect audio source node:", err);
      }
    }

    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  public getAnalyser(): AnalyserNode | null {
    return this.analyser;
  }

  public setVolume(val: number) {
    this.volumeLevel = val;
    if (this.masterVol) {
      this.masterVol.gain.setValueAtTime(this.isMuted ? 0 : val, this.ctx?.currentTime || 0);
    }
  }

  public toggleMute() {
    this.isMuted = !this.isMuted;
    this.setVolume(this.volumeLevel);
    return this.isMuted;
  }

  public playSong(song: Song, forceSynth: boolean = false) {
    this.initCtx();
    
    // Stop any active scheduled playbacks/audio elements
    this.stop();
    
    this.song = song;
    this.isPlaying = true;

    if (song.audioUrl && !forceSynth) {
      // PLAY REAL MP3 SEARCH RESULT!
      if (this.audioElement) {
        // Only set src if different to prevent resetting playback position unneeded
        if (this.audioElement.src !== song.audioUrl) {
          this.audioElement.src = song.audioUrl;
        }
        
        // Listen for standard track finish
        this.audioElement.onended = () => {
          this.stop();
        };

        this.audioElement.play().catch(err => {
          console.warn("Failed to play real MP3 via Web Audio, falling back to synthesizer.", err);
          // Fallback to synth notes if browser interrupts playback
          this.playSynthDirect(song);
        });
      }
    } else {
      // Fallback or synthesise via synth parameters
      this.playSynthDirect(song);
    }
  }

  private playSynthDirect(song: Song) {
    this.bpm = song.synthParams?.tempo || 80;
    this.chordProgression = song.synthParams?.progression || ["C", "Am", "F", "G"];
    if (this.chordProgression.length === 0) {
      this.chordProgression = ["C", "G", "Am", "F"];
    }
    this.instrumentStyle = song.synthParams?.instrument || "piano";
    this.currentChordIndex = 0;
    this.beatCounter = 0;

    if (this.ctx) {
      this.nextNoteTime = this.ctx.currentTime + 0.1;
      this.scheduler();
    }
  }

  public stop() {
    this.isPlaying = false;
    if (this.schedulerTimer) {
      clearTimeout(this.schedulerTimer);
      this.schedulerTimer = null;
    }
    if (this.audioElement) {
      this.audioElement.pause();
    }
  }

  private getChordFreqs(chordName: string): number[] {
    // Cleans name e.g. "Cmaj7" -> matching CHORD_NOTES key
    const cleanKey = chordName.replace(/[\s\(\)\[\]]/g, "");
    if (CHORD_NOTES[cleanKey]) return CHORD_NOTES[cleanKey];
    
    // Fallback to basic root note if not fully matched
    const matches = cleanKey.match(/^([A-G][b#]?)/);
    if (matches && CHORD_NOTES[matches[1]]) {
      return CHORD_NOTES[matches[1]];
    }
    return [130.81, 164.81, 196.00]; // Default C
  }

  private scheduler() {
    if (!this.isPlaying || !this.ctx) return;

    const scheduleAheadTime = 0.2; // How far ahead to schedule audio (seconds)
    const lookahead = 25.0; // How frequently to call scheduler (ms)

    while (this.nextNoteTime < this.ctx.currentTime + scheduleAheadTime) {
      this.scheduleNote(this.beatCounter, this.nextNoteTime);
      this.advanceNote();
    }

    this.schedulerTimer = setTimeout(() => this.scheduler(), lookahead);
  }

  private advanceNote() {
    if (!this.ctx) return;
    
    const secondsPerBeat = 60.0 / this.bpm;
    // Step by eighth notes (subdivisions of a beat) or quarter notes depending on style
    const stepDuration = this.instrumentStyle === "synthwave" ? secondsPerBeat * 0.5 : secondsPerBeat;
    
    this.nextNoteTime += stepDuration;
    this.beatCounter++;
  }

  private scheduleNote(beat: number, time: number) {
    if (!this.ctx || !this.analyser) return;

    // A pattern consists of chord changes every 4 beats
    const beatsPerChord = this.instrumentStyle === "synthwave" ? 8 : 4;
    const currentChordIndex = Math.floor(beat / beatsPerChord) % this.chordProgression.length;
    const currentChordName = this.chordProgression[currentChordIndex];
    const freqs = this.getChordFreqs(currentChordName);

    // Trigger visualizer updates for beats
    const beatIndexInChord = beat % beatsPerChord;
    if (beatIndexInChord === 0) {
      // Notify client that chord changed or beat hit
      setTimeout(() => {
        this.onBeatTrigger(beat);
      }, 0);
    }

    // Play Instrument Style
    switch (this.instrumentStyle) {
      case "ambient":
        // Ambient: Slow rich pads that swell on chord change
        if (beatIndexInChord === 0) {
          this.triggerAmbientPad(freqs, time, 4.0);
        }
        break;

      case "lofi":
        // Lofi: Soft Electric Piano pluck + tiny dusty kick & snare
        if (beatIndexInChord === 0 || beatIndexInChord === 2) {
          // Play chords
          this.triggerPianoChord(freqs, time, 1.8, 0.4);
          this.triggerLofiDrum(time, "kick");
        } else if (beatIndexInChord === 1 || beatIndexInChord === 3) {
          this.triggerLofiDrum(time, "snare");
        }
        break;

      case "synthwave":
        // Synthwave: Fast 8th bass notes pulsing, snare on beat 2 & 4
        const synthwaveBeatNum = beat % 8; // we subdivide by 8th notes
        const bassFreq = freqs[0] * 0.5; // lower octave
        
        // 8th note bass pulse
        this.triggerMonoBass(bassFreq, time, 0.2, (synthwaveBeatNum % 2 === 0) ? 0.3 : 0.15);

        // Neon lead accents
        if (synthwaveBeatNum === 4) {
          this.triggerLeadMelody(freqs[freqs.length - 1] * 2.0, time, 0.4);
        }

        // Drum rhythms
        if (synthwaveBeatNum === 0 || synthwaveBeatNum === 4) {
          this.triggerLofiDrum(time, "kick");
        } else if (synthwaveBeatNum === 2 || synthwaveBeatNum === 6) {
          this.triggerLofiDrum(time, "snare");
        }
        break;

      case "piano":
        // Piano Arpeggios (root, 5th, octave, third flowing)
        const pianoNoteIndex = beatIndexInChord % freqs.length;
        const octaveMul = beatIndexInChord >= freqs.length ? 2.0 : 1.0;
        this.triggerPianoPluck(freqs[pianoNoteIndex] * octaveMul, time, 0.8, 0.35);
        
        if (beatIndexInChord === 0) {
          // Low bass anchor note on start of chord loop
          this.triggerPianoPluck(freqs[0] * 0.5, time, 2.5, 0.4);
        }
        break;

      case "rock":
        // Rock: Hard rhythm power chords
        if (beatIndexInChord === 0 || beatIndexInChord === 3 || beatIndexInChord === 6) {
          this.triggerDistortedChord(freqs, time, 1.2, 0.3);
          this.triggerLofiDrum(time, "kick");
        } else if (beatIndexInChord === 2 || beatIndexInChord === 4) {
          this.triggerLofiDrum(time, "snare");
        }
        break;

      default:
        // Basic acoustic-piano representation
        if (beatIndexInChord === 0) {
          this.triggerPianoChord(freqs, time, 2.0, 0.4);
        }
    }
  }

  // ----------------------------------------------------
  // PROCEDURAL INSTRUMENT OSCILLATORS & ENVELOPES
  // ----------------------------------------------------

  private triggerAmbientPad(freqs: number[], time: number, duration: number) {
    if (!this.ctx || !this.analyser) return;

    freqs.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      const filter = this.ctx!.createBiquadFilter();

      // Slanted mix of triangle and sine wave
      osc.type = idx % 2 === 0 ? "sine" : "triangle";
      osc.frequency.setValueAtTime(freq, time);

      // Filter settings for ambient warmth
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(400, time);
      filter.Q.setValueAtTime(1.0, time);

      // Long beautiful pad envelope (Attack is slow, Release is long)
      const maxVolume = 0.25 / freqs.length;
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(maxVolume, time + 1.2);
      gain.gain.setValueAtTime(maxVolume, time + duration - 1.0);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.analyser!);

      osc.start(time);
      osc.stop(time + duration);
    });
  }

  private triggerPianoChord(freqs: number[], time: number, duration: number, vol: number) {
    if (!this.ctx || !this.analyser) return;

    freqs.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      const filter = this.ctx!.createBiquadFilter();

      osc.type = "sine"; // Rhodes electric piano vibe represents cozy warm notes
      osc.frequency.setValueAtTime(freq, time);

      // Lowpass warmth filter
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(700, time);

      // EP Piano envelope
      const individualVol = vol / freqs.length;
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(individualVol, time + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.analyser!);

      osc.start(time);
      osc.stop(time + duration);
    });
  }

  private triggerPianoPluck(freq: number, time: number, duration: number, vol: number) {
    if (!this.ctx || !this.analyser) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = "sine";
    // Slight detuned second oscillator for acoustic realism
    const oscDetuned = this.ctx.createOscillator();
    oscDetuned.type = "triangle";
    oscDetuned.detune.setValueAtTime(8, time);

    osc.frequency.setValueAtTime(freq, time);
    oscDetuned.frequency.setValueAtTime(freq, time);

    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(1000, time);
    filter.frequency.exponentialRampToValueAtTime(200, time + duration);

    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(vol * 0.75, time + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

    osc.connect(filter);
    oscDetuned.connect(filter);
    filter.connect(gain);
    gain.connect(this.analyser);

    osc.start(time);
    oscDetuned.start(time);
    osc.stop(time + duration);
    oscDetuned.stop(time + duration);
  }

  private triggerMonoBass(freq: number, time: number, duration: number, vol: number) {
    if (!this.ctx || !this.analyser) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(freq, time);

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(220, time);
    filter.frequency.exponentialRampToValueAtTime(80, time + duration);

    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(vol * 0.8, time + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.analyser);

    osc.start(time);
    osc.stop(time + duration);
  }

  private triggerLeadMelody(freq: number, time: number, duration: number) {
    if (!this.ctx || !this.analyser) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, time);
    
    // Smooth vibrato LFO
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    lfo.type = "sine";
    lfo.frequency.setValueAtTime(6.0, time); // 6Hz vibrato
    lfoGain.gain.setValueAtTime(10.0, time); // detune swing
    
    lfo.connect(lfoGain);
    lfoGain.connect(osc.detune);

    filter.type = "bandpass";
    filter.frequency.setValueAtTime(1200, time);
    filter.Q.setValueAtTime(1.5, time);

    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(0.2, time + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

    lfo.start(time);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.analyser);

    osc.start(time);
    osc.stop(time + duration);
    lfo.stop(time + duration);
  }

  private triggerDistortedChord(freqs: number[], time: number, duration: number, vol: number) {
    if (!this.ctx || !this.analyser) return;

    freqs.slice(0, 3).forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      const filter = this.ctx!.createBiquadFilter();

      // Thick power guitar chord sound (combines saw waves + aggressive bandpass)
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(freq, time);

      filter.type = "peaking";
      filter.frequency.setValueAtTime(800 + idx * 200, time);
      filter.gain.setValueAtTime(12.0, time);
      filter.Q.setValueAtTime(2.0, time);

      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(vol * 0.5, time + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.analyser!);

      osc.start(time);
      osc.stop(time + duration);
    });
  }

  private triggerLofiDrum(time: number, type: "kick" | "snare") {
    if (!this.ctx || !this.analyser) return;

    if (type === "kick") {
      // 808 style soft kick synth wave
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "sine";
      // Fast pitch drop represents kick drum punch
      osc.frequency.setValueAtTime(120, time);
      osc.frequency.exponentialRampToValueAtTime(0.001, time + 0.2);

      gain.gain.setValueAtTime(0.5, time);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.22);

      osc.connect(gain);
      gain.connect(this.analyser);

      osc.start(time);
      osc.stop(time + 0.25);
    } else if (type === "snare") {
      // Soft highpassed white noise snare clap
      const bufferSize = this.ctx.sampleRate * 0.15;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noiseNode = this.ctx.createBufferSource();
      noiseNode.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(1000, time);
      filter.Q.setValueAtTime(2.0, time);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.18, time);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.15);

      noiseNode.connect(filter);
      filter.connect(gain);
      gain.connect(this.analyser);

      noiseNode.start(time);
      noiseNode.stop(time + 0.15);
    }
  }
}
