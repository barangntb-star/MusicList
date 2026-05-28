/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState, ChangeEvent } from "react";
import { Song, Playlist, LyricsData } from "./types.js";
import { AudioSynthManager } from "./utils/audio.js";
import AudioVisualizer from "./components/AudioVisualizer.js";
import PlaylistManager from "./components/PlaylistManager.js";
import SongSearchList from "./components/SongSearchList.js";
import LyricsPanel from "./components/LyricsPanel.js";
import LiveChatCompanion from "./components/LiveChatCompanion.js";
import { 
  Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, 
  Repeat, Repeat1, Disc, Sparkles, MessageCircle, Search, 
  Music, BookOpen, Layers, Download, ExternalLink
} from "lucide-react";

// Local storage key constants
const STORAGE_PLAYLISTS_KEY = "auralirik_playlists";
const STORAGE_LAST_SONG_KEY = "auralirik_last_song";

// Smart home feed preset tracks (initial state)
const PRESET_SONGS: Song[] = [
  {
    id: "hati-hati-di-jalan-tulus",
    title: "Hati-Hati di Jalan",
    artist: "Tulus",
    album: "Manusia",
    year: 2022,
    genre: "Indonesian Pop",
    duration: 240,
    mood: "Melankolis / Tenang",
    description: "Sebuah mahakarya perpisahan sarat kedewasaan tentang melepas seseorang dengan doa tulus.",
    synthParams: {
      tempo: 72,
      key: "C Major",
      progression: ["F", "G", "Em", "Am"],
      instrument: "piano"
    },
    albumArtSeed: "tulus-hati-hati"
  },
  {
    id: "fix-you-coldplay",
    title: "Fix You",
    artist: "Coldplay",
    album: "X&Y",
    year: 2005,
    genre: "Alternative Rock",
    duration: 290,
    mood: "Harapan / Sendu",
    description: "Lagu emosional legendaris tentang harapan, proses pemulihan diri, dan cahaya penuntun.",
    synthParams: {
      tempo: 74,
      key: "C Major",
      progression: ["C", "Em", "Am", "G"],
      instrument: "ambient"
    },
    albumArtSeed: "coldplay-fix-you"
  },
  {
    id: "retro-sunset-vibe",
    title: "Retro Sunset Cafe",
    artist: "Lofi Dreamer",
    album: "Chill Beats Vol. 1",
    year: 2023,
    genre: "Lofi House / Chill",
    duration: 180,
    mood: "Tenang / Santai",
    description: "Ketukan beat lofi santai dengan paduan synthesizer hangat bernuansa senja pantai.",
    synthParams: {
      tempo: 80,
      key: "A Minor",
      progression: ["Am7", "Fmaj7", "Cmaj7", "G"],
      instrument: "lofi"
    },
    albumArtSeed: "retro-sunset"
  }
];

export default function App() {
  // Synthesizer Manager Ref
  const synthRef = useRef<AudioSynthManager | null>(null);

  // Core Persistent state hooks
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [searchSongs, setSearchSongs] = useState<Song[]>(PRESET_SONGS);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  
  // Real-time playback metadata
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [activeLyrics, setActiveLyrics] = useState<LyricsData | null>(null);
  
  // Active layouts configuration
  const [currentPlaylist, setCurrentPlaylist] = useState<Playlist | null>(null);
  const [volume, setVolume] = useState(0.5);
  const [isMuted, setIsMuted] = useState(false);
  const [loopState, setLoopState] = useState<'none' | 'song' | 'playlist'>('playlist');
  const [activeTab, setActiveTab] = useState<'search' | 'lyrics' | 'chat'>('search');
  const [playbackMode, setPlaybackMode] = useState<'mp3' | 'synth' | 'youtube'>('youtube');
  
  // Active queue state context (what track matches forward/previous skips)
  const [activeQueue, setActiveQueue] = useState<Song[]>(PRESET_SONGS);

  // Mapping of preset/known song IDs to highly-optimised direct YouTube Video IDs
  const YOUTUBE_VIDEO_MAP: Record<string, string> = {
    "hati-hati-di-jalan-tulus": "y2A_E97UAtM",
    "fix-you-coldplay": "k4V3_GkySC4",
    "retro-sunset-vibe": "5qap5aO4i9A",
    "retro-sunrise-vibe": "5qap5aO4i9A",
    "someone-like-you-adele": "hLQl3WQQoQ0",
    "midnight-city-run": "dX3kKvKyHmw",
    "fly-me-to-the-moon": "mQR0bXO_yI8"
  };

  // Custom User YouTube IDs per song ID (saved in localStorage)
  const [customYoutubeIds, setCustomYoutubeIds] = useState<Record<string, string>>(() => {
    try {
      const stored = localStorage.getItem("auralirik_custom_youtube");
      return stored ? JSON.parse(stored) : {};
    } catch (e) {
      return {};
    }
  });

  const [youtubeInput, setYoutubeInput] = useState("");
  const [isYoutubeAutopasting, setIsYoutubeAutopasting] = useState(false);
  const [skippedYoutubeSongs, setSkippedYoutubeSongs] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!currentSong) return;
    if (skippedYoutubeSongs[currentSong.id]) {
      const customId = customYoutubeIds[currentSong.id];
      if (customId) {
        setYoutubeInput(`https://www.youtube.com/watch?v=${customId}`);
      } else {
        setYoutubeInput("");
      }
      return;
    }

    const customId = customYoutubeIds[currentSong.id];
    const knownId = YOUTUBE_VIDEO_MAP[currentSong.id];
    const activeId = customId || knownId;

    if (activeId) {
      setYoutubeInput(`https://www.youtube.com/watch?v=${activeId}`);
      return;
    }

    setYoutubeInput(""); // Clear for visual "pasting" loading feedback

    let isSubscribed = true;
    const resolveVideo = async () => {
      setIsYoutubeAutopasting(true);
      try {
        const query = `${currentSong.artist} ${currentSong.title} official lyrics`;
        const res = await fetch(`/api/youtube-suggest?q=${encodeURIComponent(query)}`);
        if (res.ok && isSubscribed) {
          const data = await res.json();
          if (data.videoId) {
            setCustomYoutubeIds(prev => {
              const updated = {
                ...prev,
                [currentSong.id]: data.videoId
              };
              localStorage.setItem("auralirik_custom_youtube", JSON.stringify(updated));
              return updated;
            });
            setYoutubeInput(`https://www.youtube.com/watch?v=${data.videoId}`);
          }
        }
      } catch (err) {
        console.error("Gagal melakukan pencarian YouTube otomatis:", err);
      } finally {
        if (isSubscribed) {
          setIsYoutubeAutopasting(false);
        }
      }
    };

    resolveVideo();

    return () => {
      isSubscribed = false;
    };
  }, [currentSong?.id, skippedYoutubeSongs]);

  const handleSaveCustomYoutube = () => {
    if (!currentSong || !youtubeInput.trim()) return;
    
    let videoId = youtubeInput.trim();
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = youtubeInput.match(regExp);
    if (match && match[2].length === 11) {
      videoId = match[2];
    }
    
    const updated = {
      ...customYoutubeIds,
      [currentSong.id]: videoId
    };
    setCustomYoutubeIds(updated);
    localStorage.setItem("auralirik_custom_youtube", JSON.stringify(updated));
    setYoutubeInput("");
  };

  const getYouTubeEmbedUrl = (song: Song | null) => {
    if (!song) return "";
    
    const customId = customYoutubeIds[song.id];
    if (customId) {
      return `https://www.youtube.com/embed/${customId}?autoplay=1&enablejsapi=1&rel=0`;
    }
    
    const knownId = YOUTUBE_VIDEO_MAP[song.id];
    if (knownId) {
      return `https://www.youtube.com/embed/${knownId}?autoplay=1&enablejsapi=1&rel=0`;
    }
    
    return `https://www.youtube.com/embed/videoseries?listType=search&list=${encodeURIComponent(song.artist + " " + song.title + " (Lyrics)")}&autoplay=1&enablejsapi=1&rel=0`;
  };

  // Status loading indicators
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [isLyricsLoading, setIsLyricsLoading] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);

  // Initialize synthesizer and retrieve stored data on component mount
  useEffect(() => {
    // 1. Setup Synthesizer wrapper
    synthRef.current = new AudioSynthManager();
    synthRef.current.setVolume(0.5);

    // 2. Load custom playlists from LocalStorage
    const storedPlaylists = localStorage.getItem(STORAGE_PLAYLISTS_KEY);
    if (storedPlaylists) {
      try {
        setPlaylists(JSON.parse(storedPlaylists));
      } catch (e) {
        console.error("Failed to parse playlists:", e);
      }
    }

    // 3. Load last played song
    const storedLastSong = localStorage.getItem(STORAGE_LAST_SONG_KEY);
    if (storedLastSong) {
      try {
        const parsed = JSON.parse(storedLastSong);
        setCurrentSong(parsed);
        prefetchLyrics(parsed);
      } catch (e) {
        console.error("Failed to parse last track:", e);
      }
    }

    // 4. Load stored playback mode preference
    const storedMode = localStorage.getItem("auralirik_playback_mode");
    if (storedMode === 'mp3' || storedMode === 'synth' || storedMode === 'youtube') {
      setPlaybackMode(storedMode);
    }
  }, []);

  // Timer Tick implementation (keeps visualizer and play progres in lock step)
  useEffect(() => {
    let timer: any = null;
    if (isPlaying && currentSong) {
      timer = setInterval(() => {
        setProgress((prev) => {
          const limit = playbackMode === 'mp3' ? 30 : currentSong.duration;
          if (prev >= limit) {
            handleTrackFinished();
            return 0;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isPlaying, currentSong?.id, loopState, playbackMode]);

  // Synchronize playing state with YouTube Iframe API via postMessage
  useEffect(() => {
    if (playbackMode !== 'youtube' || !currentSong) return;

    // Send command to the iframe after a tiny timeout to ensure it has begun rendering/loading
    const timeoutId = setTimeout(() => {
      const iframe = document.getElementById("youtube-player-iframe") as HTMLIFrameElement | null;
      if (!iframe || !iframe.contentWindow) return;
      
      try {
        const cmd = isPlaying ? "playVideo" : "pauseVideo";
        iframe.contentWindow.postMessage(JSON.stringify({
          event: "command",
          func: cmd,
          args: ""
        }), "*");
      } catch (e) {
        console.error("[YouTube Sync] Failed to postMessage:", e);
      }
    }, 400);

    return () => clearTimeout(timeoutId);
  }, [isPlaying, currentSong?.id, playbackMode]);

  // Synchronize play button with synth parameters
  const playTrack = (song: Song, queueContext?: Song[], forceMode?: 'mp3' | 'synth' | 'youtube') => {
    if (!synthRef.current) return;

    setCurrentSong(song);
    setProgress(0);
    setIsPlaying(true);
    
    // Play with Web Audio synthesizer (passed as forceSynth if mode is synth)
    const activeMode = forceMode || playbackMode;
    if (activeMode === 'youtube') {
      synthRef.current.stop();
    } else {
      synthRef.current.playSong(song, activeMode === 'synth');
      synthRef.current.setVolume(isMuted ? 0 : volume);
    }

    // Set storage
    localStorage.setItem(STORAGE_LAST_SONG_KEY, JSON.stringify(song));

    // Update active surrounding queue context for Skip Forward/Back action
    if (queueContext && queueContext.length > 0) {
      setActiveQueue(queueContext);
    }

    // Prefetch lyrics details
    prefetchLyrics(song);
  };

  const handleTogglePlay = () => {
    if (!currentSong) {
      // Lazy search a song to make play action beautiful
      if (searchSongs.length > 0) {
        playTrack(searchSongs[0], searchSongs);
      }
      return;
    }

    if (!synthRef.current) return;

    if (isPlaying) {
      synthRef.current.stop();
      setIsPlaying(false);
    } else {
      if (playbackMode === 'youtube') {
        synthRef.current.stop();
      } else {
        synthRef.current.playSong(currentSong, playbackMode === 'synth');
        synthRef.current.setVolume(isMuted ? 0 : volume);
      }
      setIsPlaying(true);
    }
  };

  const handleSeek = (newProgress: number) => {
    if (!currentSong) return;
    const clamped = Math.max(0, Math.min(newProgress, currentSong.duration));
    setProgress(clamped);
    // Synced scrolling lyrics will automatically scroll based on this clamp!
  };

  const handleSkipNext = () => {
    if (activeQueue.length === 0) return;
    const currentIdx = activeQueue.findIndex((s) => s.id === currentSong?.id);
    if (currentIdx === -1) {
      // play first of queue
      playTrack(activeQueue[0]);
    } else {
      const nextIdx = (currentIdx + 1) % activeQueue.length;
      playTrack(activeQueue[nextIdx]);
    }
  };

  const handleSkipPrev = () => {
    if (activeQueue.length === 0) return;
    const currentIdx = activeQueue.findIndex((s) => s.id === currentSong?.id);
    if (currentIdx === -1) {
      playTrack(activeQueue[0]);
    } else {
      const prevIdx = currentIdx === 0 ? activeQueue.length - 1 : currentIdx - 1;
      playTrack(activeQueue[prevIdx]);
    }
  };

  const handleTrackFinished = () => {
    if (loopState === "song" && currentSong) {
      playTrack(currentSong);
    } else if (loopState === "playlist") {
      handleSkipNext();
    } else {
      setIsPlaying(false);
      setProgress(0);
      synthRef.current?.stop();
    }
  };

  const handleVolumeChange = (e: ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    setIsMuted(val === 0);
    synthRef.current?.setVolume(val);
  };

  const handleToggleMute = () => {
    if (!synthRef.current) return;
    const muteState = synthRef.current.toggleMute();
    setIsMuted(muteState);
  };

  const handleToggleLoop = () => {
    if (loopState === "playlist") setLoopState("song");
    else if (loopState === "song") setLoopState("none");
    else setLoopState("playlist");
  };

  // ----------------------------------------------------
  // SERVER SIDE API CALL METHODS
  // ----------------------------------------------------

  const handleSearchSongs = async (query: string) => {
    setIsSearchLoading(true);
    // Shift tab back to search outcomes automatically
    setActiveTab("search");
    // Clear currently selected playlist so search results are visible
    setCurrentPlaylist(null);

    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query })
      });
      if (res.ok) {
        const data = await res.json();
        setSearchSongs(data);
        if (data.length > 0) {
          // Update active queue to matching search outputs
          setActiveQueue(data);
        }
      }
    } catch (e) {
      console.error("Failed to query API search:", e);
    } finally {
      setIsSearchLoading(false);
    }
  };

  const prefetchLyrics = async (song: Song) => {
    setIsLyricsLoading(true);
    setActiveLyrics(null);
    try {
      const res = await fetch("/api/lyrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: song.id,
          title: song.title,
          artist: song.artist,
          duration: song.duration
        })
      });
      if (res.ok) {
        const data = await res.json();
        setActiveLyrics(data);
      }
    } catch (e) {
      console.error("Lyrics prefetch failed:", e);
    } finally {
      setIsLyricsLoading(false);
    }
  };

  const handleAskAISuggestions = async (playlist: Playlist) => {
    if (playlist.songs.length === 0 || isSuggesting) return;
    setIsSuggesting(true);

    try {
      const res = await fetch("/api/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ songs: playlist.songs })
      });
      if (res.ok) {
        const suggestedTracks: Song[] = await res.json();
        // Append all recommended songs that aren't already inside the playlist
        const updatedPlaylists = playlists.map((pl) => {
          if (pl.id === playlist.id) {
            const filteredNewSongs = suggestedTracks.filter(
              (newS) => !pl.songs.some((oldS) => oldS.id === newS.id)
            );
            return {
              ...pl,
              songs: [...pl.songs, ...filteredNewSongs]
            };
          }
          return pl;
        });

        setPlaylists(updatedPlaylists);
        localStorage.setItem(STORAGE_PLAYLISTS_KEY, JSON.stringify(updatedPlaylists));
        
        // Auto update current playlist UI view
        const refreshedCurrent = updatedPlaylists.find((pl) => pl.id === playlist.id) || null;
        setCurrentPlaylist(refreshedCurrent);
      }
    } catch (e) {
      console.error("Failed to fetch suggestions:", e);
    } finally {
      setIsSuggesting(false);
    }
  };

  // ----------------------------------------------------
  // PLAYLIST MODIFIERS (CLIENT SIDE STORAGE)
  // ----------------------------------------------------

  const handleCreatePlaylist = (name: string, desc?: string) => {
    const newPl: Playlist = {
      id: `pl-${Date.now()}`,
      name,
      description: desc,
      createdAt: new Date().toISOString(),
      songs: []
    };
    const updated = [...playlists, newPl];
    setPlaylists(updated);
    localStorage.setItem(STORAGE_PLAYLISTS_KEY, JSON.stringify(updated));
  };

  const handleDeletePlaylist = (id: string) => {
    const updated = playlists.filter((pl) => pl.id !== id);
    setPlaylists(updated);
    localStorage.setItem(STORAGE_PLAYLISTS_KEY, JSON.stringify(updated));
    if (currentPlaylist?.id === id) {
      setCurrentPlaylist(null);
    }
  };

  const handleAddSongToPlaylist = (playlistId: string, song: Song) => {
    const updated = playlists.map((pl) => {
      if (pl.id === playlistId) {
        // Prevent duplicate songs inside the same list
        if (pl.songs.some((s) => s.id === song.id)) return pl;
        return {
          ...pl,
          songs: [...pl.songs, song]
        };
      }
      return pl;
    });

    setPlaylists(updated);
    localStorage.setItem(STORAGE_PLAYLISTS_KEY, JSON.stringify(updated));
    
    // Sync current viewed playlist if active
    if (currentPlaylist?.id === playlistId) {
      setCurrentPlaylist(updated.find((pl) => pl.id === playlistId) || null);
    }
  };

  const handleRemoveSongFromPlaylist = (playlistId: string, songId: string) => {
    const updated = playlists.map((pl) => {
      if (pl.id === playlistId) {
        return {
          ...pl,
          songs: pl.songs.filter((s) => s.id !== songId)
        };
      }
      return pl;
    });

    setPlaylists(updated);
    localStorage.setItem(STORAGE_PLAYLISTS_KEY, JSON.stringify(updated));

    // Sync active viewed playlist
    if (currentPlaylist?.id === playlistId) {
      setCurrentPlaylist(updated.find((pl) => pl.id === playlistId) || null);
    }
  };

  // Convert seconds into standard string representation (Minute:Seconds)
  const formatTimeText = (secNum: number) => {
    const m = Math.floor(secNum / 60);
    const s = Math.floor(secNum % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div id="aura-lirik-app" className="min-h-screen bg-zinc-950 text-white font-sans flex flex-col md:pb-24 pb-36 selection:bg-emerald-500/30 selection:text-emerald-100">
      
      {/* 1. Header/Navbar Brand */}
      <header className="border-b border-zinc-900 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-40 select-none">
        <div className="max-w-7xl mx-auto px-4 py-3.5 flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 shadow-inner flex items-center justify-center">
              <Disc className="w-5 h-5 text-emerald-400 animate-spin" style={{ animationDuration: "6s" }} />
            </div>
            <div>
              <span className="text-[9px] font-mono tracking-widest text-emerald-400 font-bold block leading-none">CARI LAGU & LIRIK</span>
              <h1 className="text-md font-bold tracking-tight text-white mt-0.5">AuraLirik Pro</h1>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-1.5 p-1 rounded-lg bg-zinc-900/60 border border-zinc-800 text-[10px] text-zinc-500 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              SINTESIS SUARA TERINTEGRASI
            </div>
          </div>
        </div>
      </header>

      {/* 2. Primary Bento Workspace Grid */}
      <main className="max-w-7xl mx-auto px-4 py-6 w-full flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Side Bento Column: Manager controls (4 cols) */}
        <div className="col-span-1 lg:col-span-4 space-y-6">
          
          {/* Sidebar Playlist */}
          <PlaylistManager
            playlists={playlists}
            currentPlaylist={currentPlaylist}
            onSelectPlaylist={(pl) => {
              setCurrentPlaylist(pl);
              if (pl) {
                // Point active queue context to the playlist songs
                setActiveQueue(pl.songs);
              } else {
                setActiveQueue(searchSongs);
              }
            }}
            onCreatePlaylist={handleCreatePlaylist}
            onDeletePlaylist={handleDeletePlaylist}
            onRemoveSongFromPlaylist={handleRemoveSongFromPlaylist}
            onPlaySong={playTrack}
            onAskAISuggestions={handleAskAISuggestions}
            isSuggesting={isSuggesting}
          />

          {/* Active Album Artwork Card & FFT visualizer */}
          <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-2xl flex flex-col space-y-4">
            <div className="flex gap-3 items-center">
              <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-zinc-950/80 border border-zinc-800 flex items-center justify-center shrink-0">
                {currentSong ? (
                  <img
                    src={currentSong.albumArtUrl || `https://picsum.photos/seed/${currentSong.albumArtSeed || currentSong.id}/140/140`}
                    alt={currentSong.title}
                    referrerPolicy="no-referrer"
                    className={`w-full h-full object-cover transition-all duration-700 ${isPlaying ? 'scale-105 rotate-6' : 'scale-100 rotate-0'}`}
                  />
                ) : (
                  <Disc className="w-6 h-6 text-zinc-700" />
                )}
                {isPlaying && (
                  <span className="absolute inset-0 bg-black/10 flex items-center justify-center animate-pulse">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[9px] font-mono uppercase bg-zinc-950 px-1.5 py-0.5 rounded text-zinc-500 font-semibold tracking-wider">
                  {currentSong ? currentSong.genre : "SILENT VIBE"}
                </span>
                <h4 className="text-xs font-bold text-zinc-200 mt-1.5 truncate">
                  {currentSong ? currentSong.title : "Pilih Lagu"}
                </h4>
                <p className="text-[10px] text-zinc-500 mt-0.5 truncate">
                  {currentSong ? currentSong.artist : "Belum ada lagu berputar"}
                </p>
              </div>
            </div>

             {/* Canvas Analyzer visualizer or YouTube Iframe Player */}
            {(playbackMode === 'youtube' || !isPlaying) ? (
              currentSong ? (
                <div className="flex flex-col gap-2.5 w-full">
                  <div id="youtube-player-card" className="w-full h-52 rounded-xl overflow-hidden bg-black border border-zinc-700/50 shadow-md relative group">
                    <iframe
                      id="youtube-player-iframe"
                      width="100%"
                      height="100%"
                      src={getYouTubeEmbedUrl(currentSong)}
                      title={`${currentSong.artist} - ${currentSong.title}`}
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="w-full h-full"
                    ></iframe>
                    <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/90 rounded border border-zinc-800 text-[9px] font-mono text-emerald-400 select-none flex items-center gap-1.5 shadow">
                      <span className={`w-1.5 h-1.5 rounded-full ${isPlaying ? 'bg-red-500 animate-ping' : 'bg-red-900'}`} />
                      YouTube Mode {isPlaying ? '(Memutar)' : '(Siap / Ketuk untuk Putar)'}
                    </div>
                    {isYoutubeAutopasting && (
                      <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center gap-2">
                        <span className="w-5 h-5 rounded-full border-2 border-red-500 border-t-transparent animate-spin" />
                        <span className="text-[9px] font-mono text-zinc-400 animate-pulse">Menempel tautan otomatis...</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Custom YouTube URL Editor */}
                  <div className="flex flex-col gap-1.5 p-2 bg-zinc-950/80 rounded-xl border border-zinc-800/60 shadow-inner">
                    <div className="flex items-center justify-between">
                      <label className="text-[9px] font-mono text-zinc-400 font-bold uppercase tracking-wider">
                        Atur Video YouTube Kustom
                      </label>
                      <button
                        onClick={() => {
                          window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(currentSong.artist + ' ' + currentSong.title + ' official lyrics')}`, '_blank');
                        }}
                        className="text-[8px] font-bold text-red-400 hover:text-red-300 transition-colors uppercase cursor-pointer"
                        title="Klik untuk membuka pencarian YouTube di tab baru"
                      >
                        🔍 Cari di YouTube
                      </button>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <input
                        type="text"
                        placeholder={isYoutubeAutopasting ? "Mencari tautan secara otomatis..." : "Tempel link video YouTube (contoh: https://www.youtube.com/watch?v=...) atau ID di sini..."}
                        value={youtubeInput}
                        onChange={(e) => setYoutubeInput(e.target.value)}
                        disabled={isYoutubeAutopasting}
                        className="flex-1 bg-zinc-900 px-2.5 py-1 text-[10px] text-zinc-300 placeholder-zinc-650 focus:outline-none focus:border-red-500/50 border border-zinc-800 rounded-md disabled:opacity-50"
                      />
                      <button
                        onClick={handleSaveCustomYoutube}
                        disabled={isYoutubeAutopasting || !youtubeInput.trim()}
                        className="px-2.5 py-1 bg-red-600 hover:bg-red-500 text-white font-bold rounded-md text-[10px] transition-all shrink-0 cursor-pointer disabled:opacity-55 disabled:cursor-not-allowed"
                      >
                        Pasang
                      </button>
                    </div>
                    {(customYoutubeIds[currentSong.id] || isYoutubeAutopasting) && (
                      <div className="flex items-center justify-between text-[8px] text-zinc-500 font-mono mt-0.5 px-0.5">
                        <span>
                          {isYoutubeAutopasting 
                            ? "Sedang menempel otomatis dari YouTube..." 
                            : `Video kustom aktif (ID: ${customYoutubeIds[currentSong.id]})`
                          }
                        </span>
                        {!isYoutubeAutopasting && (
                          <button
                            onClick={() => {
                              const updated = { ...customYoutubeIds };
                              delete updated[currentSong.id];
                              setCustomYoutubeIds(updated);
                              localStorage.setItem("auralirik_custom_youtube", JSON.stringify(updated));
                              setSkippedYoutubeSongs(prev => ({ ...prev, [currentSong.id]: true }));
                              setYoutubeInput("");
                            }}
                            className="text-amber-500 hover:underline cursor-pointer font-bold"
                          >
                            Hapus Kustom
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div id="youtube-player-placeholder" className="w-full h-52 rounded-xl border border-dashed border-red-500/30 bg-zinc-950 flex flex-col items-center justify-center p-4 text-center">
                  <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 mb-2">
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                      <path d="M23.498 6.163a3.003 3.003 0 0 0-2.11-2.11C19.518 3.545 12 3.545 12 3.545s-7.518 0-9.388.508a3.003 3.003 0 0 0-2.11 2.11C0 8.033 0 12 0 12s0 3.967.502 5.837a3.003 3.003 0 0 0 2.11 2.11c1.87.508 9.388.508 9.388.508s7.518 0 9.388-.508a3.003 3.003 0 0 0 2.11-2.11C24 15.967 24 12 24 12s0-3.967-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                    </svg>
                  </div>
                  <h5 className="text-xs font-bold text-zinc-300">YouTube Player Terintegrasi</h5>
                  <p className="text-[10px] text-zinc-500 mt-1 max-w-[200px]">Pilih salah satu lagu dalam daftar untuk menampilkan video dan memutarnya secara utuh!</p>
                </div>
              )
            ) : (
              <AudioVisualizer
                analyser={synthRef.current?.getAnalyser() || null}
                isPlaying={isPlaying}
                accentColor={currentSong?.synthParams?.instrument === 'synthwave' ? '#f43f5e' : '#10b981'}
              />
            )}
          </div>

        </div>

        {/* Right Side Bento Column: Segmented View Panels (8 cols) */}
        <div className="col-span-1 lg:col-span-8 flex flex-col space-y-6">
          
          {/* Header minimal Navigation tabs */}
          <div className="flex bg-zinc-900/60 p-1.5 rounded-2xl border border-zinc-800 self-start select-none">
            <button
              id="tab-search"
              onClick={() => {
                setActiveTab("search");
                setCurrentPlaylist(null);
              }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
                activeTab === "search"
                  ? "bg-zinc-800 text-white shadow-xl"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Search className="w-4 h-4 text-emerald-400" />
              Cari Lagu & Mood
            </button>
            <button
              id="tab-lyrics"
              onClick={() => setActiveTab("lyrics")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
                activeTab === "lyrics"
                  ? "bg-zinc-800 text-white shadow-xl"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <BookOpen className="w-4 h-4 text-violet-400" />
              Lirik & Makna
            </button>
            <button
              id="tab-chat"
              onClick={() => setActiveTab("chat")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold cursor-pointer transition-all pr-5 ${
                activeTab === "chat"
                  ? "bg-zinc-800 text-white shadow-xl"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <MessageCircle className="w-4 h-4 text-indigo-400 animate-pulse" />
              AI DJ Companion
            </button>
          </div>

          {/* Render Active Column panel dynamically */}
          <div className="flex-1">
            {activeTab === "search" && (
              <SongSearchList
                onSearch={handleSearchSongs}
                songs={currentPlaylist ? currentPlaylist.songs : searchSongs}
                playlists={playlists}
                currentPlaylist={currentPlaylist}
                onClearPlaylistFilter={() => setCurrentPlaylist(null)}
                onAddSongToPlaylist={handleAddSongToPlaylist}
                onPlaySong={playTrack}
                isLoading={isSearchLoading}
                activeSongId={currentSong?.id || null}
              />
            )}

            {activeTab === "lyrics" && (
              <LyricsPanel
                song={currentSong}
                lyrics={activeLyrics}
                currentTime={progress}
                onSeek={handleSeek}
                isLoading={isLyricsLoading}
                onRefreshLyrics={() => currentSong && prefetchLyrics(currentSong)}
              />
            )}

            {activeTab === "chat" && (
              <LiveChatCompanion
                playlists={playlists}
                onAddSongToPlaylist={handleAddSongToPlaylist}
                onPlaySong={playTrack}
              />
            )}
          </div>

        </div>

      </main>

      {/* 3. Floating Bottom Media Player Bar */}
      <footer className="fixed bottom-0 inset-x-0 bg-zinc-950/95 border-t border-zinc-900 p-4 z-50 shadow-2xl backdrop-blur-lg select-none">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Playback Track description */}
          <div className="flex items-center gap-3 w-full md:w-[28%] min-w-0">
            <div className={`relative w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0 overflow-hidden ${isPlaying ? 'animate-pulse' : ''}`}>
              {currentSong ? (
                <img
                  src={currentSong.albumArtUrl || `https://picsum.photos/seed/${currentSong.albumArtSeed || currentSong.id}/120/120`}
                  alt={currentSong.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              ) : (
                <Music className="w-5 h-5 text-zinc-600" />
              )}
            </div>
            
            <div className="min-w-0 flex-1">
              <h4 className="text-xs font-bold text-zinc-100 truncate">
                {currentSong ? currentSong.title : "Pilih Lagu Temuan"}
              </h4>
              <p className="text-[10px] text-zinc-500 truncate mt-0.5">
                {currentSong ? `${currentSong.artist} • ${currentSong.synthParams?.key || 'C Major'}` : "Ketuk putar pada lagu katalog"}
              </p>
              {currentSong && (
                <div className="flex flex-col gap-1 mt-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[8px] font-mono bg-zinc-900 px-1 py-0.5 rounded text-zinc-400 capitalize">
                      {currentSong.synthParams?.instrument || 'piano'} Style
                    </span>
                    <span className="text-[8px] font-mono text-zinc-600">
                      {currentSong.synthParams?.tempo || 80} BPM
                    </span>
                  </div>
                  {/* SoundCloud & Audiomack Direct Connections & MP3 Downloads */}
                  <div className="flex items-center gap-1 w-full flex-wrap mt-1">
                    <a
                      id="player-sc"
                      href={currentSong.soundcloudUrl || `https://soundcloud.com/search?q=${encodeURIComponent(currentSong.artist + ' ' + currentSong.title)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-1.5 py-0.5 rounded bg-orange-600/10 border border-orange-500/20 text-orange-400 hover:bg-orange-600/25 transition-colors flex items-center gap-0.5 text-[8px] font-bold"
                      title="Alihkan/Putar Gratis di SoundCloud"
                    >
                      <span>☁️</span> SoundCloud
                    </a>
                    <a
                      id="player-am"
                      href={currentSong.audiomackUrl || `https://audiomack.com/search?q=${encodeURIComponent(currentSong.artist + ' ' + currentSong.title)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/25 text-amber-400 hover:bg-amber-500/25 transition-colors flex items-center gap-0.5 text-[8px] font-bold"
                      title="Alihkan/Putar Gratis di Audiomack"
                    >
                      <span>🍊</span> Audiomack
                    </a>

                    {currentSong.audioUrl && (
                      <>
                        <a
                          id="player-dl-sampel"
                          href={currentSong.audioUrl}
                          download={`${currentSong.artist} - ${currentSong.title}.mp3`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/25 transition-colors flex items-center gap-0.5 text-[8px] font-bold"
                          title="Unduh MP3 Singkat Gratis (30 Detik)"
                        >
                          <Download className="w-2.5 h-2.5 animate-pulse" /> Unduh MP3
                        </a>
                        <a
                          id="player-dl-full"
                          href={`https://www.google.com/search?q=${encodeURIComponent(currentSong.artist + ' ' + currentSong.title + ' mp3 download gratis free')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/25 text-amber-400 hover:bg-amber-500/25 transition-colors flex items-center gap-0.5 text-[8px] font-bold"
                          title="Cari Link Unduh MP3 Lagu Lengkap"
                        >
                          <ExternalLink className="w-2.5 h-2.5" /> Cari Lengkap
                        </a>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Media Player Controls Row */}
          <div className="flex flex-col items-center gap-2 w-full md:w-[44%]">
            <div className="flex items-center gap-4">
              <button
                id="player-skip-back"
                onClick={handleSkipPrev}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors cursor-pointer"
                title="Sebelumnya"
              >
                <SkipBack className="w-4 h-4 fill-current" />
              </button>

              <button
                id="player-toggle-play"
                onClick={handleTogglePlay}
                className="p-3 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black shadow-lg shadow-emerald-500/10 cursor-pointer flex items-center justify-center transition-transform hover:scale-105"
                title={isPlaying ? "Jeda" : "Putar"}
              >
                {isPlaying ? <Pause className="w-5 h-5 fill-black" /> : <Play className="w-5 h-5 fill-black ml-0.5" />}
              </button>

              <button
                id="player-skip-next"
                onClick={handleSkipNext}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors cursor-pointer"
                title="Lanjut"
              >
                <SkipForward className="w-4 h-4 fill-current" />
              </button>

              {/* Loop Track controller */}
              <button
                id="player-toggle-loop"
                onClick={handleToggleLoop}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1 shrink-0 ${
                  loopState === "none"
                    ? "text-zinc-600 hover:text-zinc-400"
                    : "text-emerald-400 bg-emerald-500/5 border border-emerald-500/10"
                }`}
                title="Looping Mode"
              >
                {loopState === "song" ? <Repeat1 className="w-4 h-4" /> : <Repeat className="w-4 h-4" />}
                <span className="text-[8px] font-mono uppercase hidden sm:inline">
                  {loopState === "none" ? "OFF" : loopState === "song" ? "TRACK" : "PLAYLIST"}
                </span>
              </button>

              {/* Mode Selector (MP3 sample vs Procedural Full Synth vs YouTube Player) */}
              <div className="flex items-center bg-zinc-900 rounded-lg p-0.5 border border-zinc-800/85 ml-1 shrink-0 select-none">
                <button
                  id="mode-mp3-btn"
                  onClick={() => {
                    setPlaybackMode('mp3');
                    localStorage.setItem("auralirik_playback_mode", 'mp3');
                    if (isPlaying && currentSong) {
                      playTrack(currentSong, undefined, 'mp3');
                    }
                  }}
                  className={`px-1.5 py-1 text-[8px] sm:text-[9px] font-bold rounded-md transition-all cursor-pointer ${
                    playbackMode === 'mp3'
                      ? "bg-zinc-800 text-emerald-400 border border-zinc-700/50"
                      : "text-zinc-500 hover:text-zinc-400"
                  }`}
                  title="Dengarkan klip potongan MP3 sampel audio resmi deezer"
                >
                  🎵 Clip MP3
                </button>
                <button
                  id="mode-synth-btn"
                  onClick={() => {
                    setPlaybackMode('synth');
                    localStorage.setItem("auralirik_playback_mode", 'synth');
                    if (isPlaying && currentSong) {
                      playTrack(currentSong, undefined, 'synth');
                    }
                  }}
                  className={`px-1.5 py-1 text-[8px] sm:text-[9px] font-bold rounded-md transition-all cursor-pointer ${
                    playbackMode === 'synth'
                      ? "bg-zinc-800 text-violet-400 border border-zinc-700/50"
                      : "text-zinc-500 hover:text-zinc-400"
                  }`}
                  title="Sintesis penuh progresi kord harmoni & drum lofi lagunya!"
                >
                  🎹 Full Synth
                </button>
                <button
                  id="mode-youtube-btn"
                  onClick={() => {
                    setPlaybackMode('youtube');
                    localStorage.setItem("auralirik_playback_mode", 'youtube');
                    if (isPlaying && currentSong) {
                      playTrack(currentSong, undefined, 'youtube');
                    }
                  }}
                  className={`px-1.5 py-1 text-[8px] sm:text-[9px] font-bold rounded-md transition-all cursor-pointer ${
                    playbackMode === 'youtube'
                      ? "bg-red-600 text-white font-black shadow-sm"
                      : "text-zinc-500 hover:text-zinc-400"
                  }`}
                  title="Dengarkan video lagu penuh vokal asli melalui YouTube Player terintegrasi!"
                >
                  🔴 YT Player
                </button>
              </div>
            </div>

            {/* Slider Seek Bar */}
            <div className="flex flex-col w-full gap-1.5">
              <div className="flex items-center gap-2.5 w-full text-[10px] font-mono text-zinc-500">
                <span className="w-8 text-right">{formatTimeText(progress)}</span>
                <input
                  id="player-progress-slider"
                  type="range"
                  min="0"
                  max={currentSong ? (playbackMode === 'mp3' ? 30 : currentSong.duration) : "100"}
                  value={progress}
                  onChange={(e) => handleSeek(parseInt(e.target.value))}
                  className="flex-1 accent-emerald-500 bg-zinc-800 h-1 rounded-full cursor-pointer outline-none transition-all hover:h-1.5"
                />
                <span className="w-8 text-left">
                  {currentSong ? formatTimeText(playbackMode === 'mp3' ? 30 : currentSong.duration) : "0:00"}
                </span>
              </div>

              {/* Informative Help Guide for Full Track Playback */}
              {currentSong && (
                <div className="text-[9px] text-zinc-500 text-center flex flex-wrap items-center justify-center gap-x-1.5 gap-y-0.5 select-none leading-none">
                  {playbackMode === 'mp3' ? (
                    <>
                      <span className="text-amber-500/90 font-medium font-bold">⚠️ MP3 Clip terbatas (30s).</span>
                      <span>Putar penuh via:</span>
                      <button
                        onClick={() => {
                          setPlaybackMode('youtube');
                          localStorage.setItem("auralirik_playback_mode", 'youtube');
                          if (isPlaying) playTrack(currentSong, undefined, 'youtube');
                        }}
                        className="text-red-400 font-bold hover:text-red-300 underline cursor-pointer"
                        title="Dengarkan vokal asli penuh di YouTube Player"
                      >
                        🔴 YT Player
                      </button>
                      <span>atau</span>
                      <button
                        onClick={() => {
                          setPlaybackMode('synth');
                          localStorage.setItem("auralirik_playback_mode", 'synth');
                          if (isPlaying) playTrack(currentSong, undefined, 'synth');
                        }}
                        className="text-violet-400 font-bold hover:text-violet-300 underline cursor-pointer"
                        title="Dengarkan harmoni & ketukan lengkap buatan synthesizer aplikasi"
                      >
                        🎹 Full Synth
                      </button>
                      <span>atau cari di:</span>
                    </>
                  ) : playbackMode === 'synth' ? (
                    <>
                      <span className="text-violet-400 font-medium font-bold">🎹 Mode Full Synth Aktif</span>
                      <span>(Aransemen synth program). Tonton vokal asli lengkap via:</span>
                      <button
                        onClick={() => {
                          setPlaybackMode('youtube');
                          localStorage.setItem("auralirik_playback_mode", 'youtube');
                          if (isPlaying) playTrack(currentSong, undefined, 'youtube');
                        }}
                        className="text-red-400 font-bold hover:text-red-300 underline cursor-pointer"
                        title="Dengarkan vokal asli penuh di YouTube Player"
                      >
                        🔴 YT Player
                      </button>
                      <span>atau cari di:</span>
                    </>
                  ) : (
                    <>
                      <span className="text-red-400 font-bold">🔴 Mode YT Player Aktif.</span>
                      <span>Memutar penuh video vokal asli (Lirik disinkronisasi & bergulir otomatis!). Cari di:</span>
                    </>
                  )}
                  <div className="flex items-center gap-1.5">
                    <a
                      href={currentSong.soundcloudUrl || `https://soundcloud.com/search?q=${encodeURIComponent(currentSong.artist + ' ' + currentSong.title)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-orange-400 hover:text-orange-300 font-semibold hover:underline"
                    >
                      ☁️ SoundCloud
                    </a>
                    <span className="text-zinc-700">•</span>
                    <a
                      href={currentSong.audiomackUrl || `https://audiomack.com/search?q=${encodeURIComponent(currentSong.artist + ' ' + currentSong.title)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-amber-500 hover:text-amber-400 font-semibold hover:underline"
                    >
                      🍊 Audiomack
                    </a>
                    <span className="text-zinc-700">•</span>
                    <button
                      onClick={() => {
                        setPlaybackMode('youtube');
                        localStorage.setItem("auralirik_playback_mode", 'youtube');
                        if (isPlaying && currentSong) {
                          playTrack(currentSong, undefined, 'youtube');
                        }
                      }}
                      className="text-red-400 hover:text-red-300 font-bold hover:underline cursor-pointer flex items-center gap-1 text-[11px]"
                      title="Putar video langsung di YouTube Player aplikasi (Tanpa keluar)"
                    >
                      🔴 Putar Terintegrasi
                    </button>
                    <span className="text-zinc-700">•</span>
                    <a
                      href={`https://www.youtube.com/results?search_query=${encodeURIComponent(currentSong.artist + ' ' + currentSong.title)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-zinc-500 hover:text-zinc-400 hover:underline text-[9px]"
                      title="Alternatif: Buka pencarian di tab YouTube eksternal"
                    >
                      🌐 Tab Baru
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Volume and Visual triggers right side of playbar */}
          <div className="hidden md:flex items-center gap-3 w-[24%] justify-end">
            
            {/* Quick lyric shortcut */}
            <button
              id="player-view-lyrics-shortcut"
              onClick={() => setActiveTab("lyrics")}
              className={`p-1.5 rounded-lg border text-[10px] font-mono uppercase flex items-center gap-1.5 cursor-pointer ${
                activeTab === "lyrics"
                  ? "bg-violet-500/10 border-violet-500/20 text-violet-300"
                  : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              Lirik
            </button>

            {/* Volume mute block */}
            <div className="flex items-center gap-2">
              <button
                id="player-toggle-mute"
                onClick={handleToggleMute}
                className="text-zinc-400 hover:text-white p-1 rounded hover:bg-zinc-900 cursor-pointer"
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <input
                id="player-volume-slider"
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                onChange={handleVolumeChange}
                className="w-18 accent-emerald-400 bg-zinc-800 h-1 rounded-full cursor-pointer"
              />
            </div>
          </div>

        </div>
      </footer>

    </div>
  );
}
