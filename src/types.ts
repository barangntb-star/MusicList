/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface SynthParams {
  tempo: number; // BPM (e.g. 60-140)
  key: string;   // Musical key (e.g. "C Major", "A Minor")
  progression: string[]; // 4 chord progression, e.g. ["Am", "F", "C", "G"]
  instrument: 'ambient' | 'lofi' | 'synthwave' | 'rock' | 'piano';
}

export interface Song {
  id: string;
  title: string;
  artist: string;
  album: string;
  year: number;
  genre: string;
  duration: number; // in seconds
  mood: string;
  description: string;
  synthParams: SynthParams;
  albumArtSeed?: string; // Seed for generating custom visual/picsum artwork
  audioUrl?: string;    // Direct MP3 URL stream
  albumArtUrl?: string; // Direct album artwork image URL
  soundcloudUrl?: string; // Direct or search URL for SoundCloud
  audiomackUrl?: string;  // Direct or search URL for Audiomack
}

export interface SyncedLyricLine {
  time: number; // in seconds
  text: string;
}

export interface LyricsData {
  lyrics: string;
  translationAvailable: boolean;
  translation?: string | null;
  meaning: string;
  syncedLyrics: SyncedLyricLine[];
  isOfflineFallback?: boolean;
}

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  songs: Song[];
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
}
