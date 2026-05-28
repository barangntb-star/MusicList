/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, FormEvent, MouseEvent } from "react";
import { Song, Playlist } from "../types.js";
import { Search, Sparkles, Plus, FolderPlus, Play, Check, Flame, Moon, Coffee, Heart, Music, Sun, Download, ExternalLink, X, ListMusic } from "lucide-react";

interface SongSearchListProps {
  onSearch: (query: string) => void;
  songs: Song[];
  playlists: Playlist[];
  currentPlaylist?: Playlist | null;
  onClearPlaylistFilter?: () => void;
  onAddSongToPlaylist: (playlistId: string, song: Song) => void;
  onPlaySong: (song: Song, playlistContext?: Song[], forceMode?: 'mp3' | 'synth' | 'youtube') => void;
  isLoading: boolean;
  activeSongId: string | null;
}

const CATEGORY_PILLS = [
  { id: "p0", label: "Coldplay & Rock", query: "Coldplay alternative rock", icon: Flame },
  { id: "p1", label: "Indonesian Pop", query: "Lagu pop Indonesia terbaik", icon: Heart },
  { id: "p2", label: "Lofi Sunset", query: "Cozy warm lofi study beats", icon: Coffee },
  { id: "p3", label: "Late Night Jazz", query: "Traditional calming jazz standards", icon: Moon },
  { id: "p4", label: "Synthwave Future", query: "Fast retro 80s neon synthwave", icon: Sun },
];

const GENRE_ITEMS = [
  { id: "g0", label: "Indonesian Pop", query: "Indonesian Pop", icon: "🇮🇩" },
  { id: "g1", label: "Rock / Metal", query: "Alternative Rock Metal", icon: "🎸" },
  { id: "g2", label: "Jazz Swing", query: "Calm Jazz Standard Blues", icon: "🎷" },
  { id: "g3", label: "Lofi / Study Beats", query: "Lofi House Chill study beats", icon: "🎧" },
  { id: "g4", label: "Synthwave 80s", query: "Fast retro 80s neon synthwave", icon: "🌆" },
  { id: "g5", label: "Acoustic / Folk", query: "Acoustic Pop Folk Gitars", icon: "🍃" },
  { id: "g6", label: "Dangdut Koplo", query: "Dangdut Koplo Nusantara", icon: "💃" },
  { id: "g7", label: "K-Pop BTS Indie", query: "K-Pop Hits Korean Pop", icon: "✨" }
];

export default function SongSearchList({
  onSearch,
  songs,
  playlists,
  currentPlaylist,
  onClearPlaylistFilter,
  onAddSongToPlaylist,
  onPlaySong,
  isLoading,
  activeSongId
}: SongSearchListProps) {
  const [searchField, setSearchField] = useState("");
  const [lastQuery, setLastQuery] = useState<string | null>(null);
  const [activeDropdownIndex, setActiveDropdownIndex] = useState<number | null>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!searchField.trim()) return;
    setLastQuery(searchField.trim());
    onSearch(searchField.trim());
  };

  const handlePillClick = (query: string) => {
    setSearchField(query);
    setLastQuery(query);
    onSearch(query);
  };

  const handleTogglePlaylistDropdown = (idx: number, e: MouseEvent) => {
    e.stopPropagation();
    if (activeDropdownIndex === idx) {
      setActiveDropdownIndex(null);
    } else {
      setActiveDropdownIndex(idx);
    }
  };

  return (
    <div id="song-search-list-container" className="flex flex-col h-full bg-zinc-900/60 rounded-2xl border border-zinc-800 p-4 relative">
      
      {/* Search Bar Form */}
      <form onSubmit={handleSubmit} className="relative mb-3 flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            id="input-main-search"
            type="text"
            placeholder="Cari lagu, penyanyi, lirik, atau ketik mood (cth: 'lofi hujan')..."
            value={searchField}
            onChange={(e) => setSearchField(e.target.value)}
            className="w-full text-xs p-3.5 pl-10 bg-zinc-950/80 rounded-xl border border-zinc-800 text-white focus:outline-none focus:border-emerald-500/50 transition-all placeholder-zinc-500"
          />
        </div>
        <button
          id="btn-submit-main-search"
          type="submit"
          disabled={isLoading}
          className="px-4 py-2.5 rounded-xl bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 border border-emerald-500/30 font-semibold cursor-pointer text-xs disabled:opacity-50 transition-all"
        >
          {isLoading ? "MENCARI..." : "CARI"}
        </button>
      </form>

      {/* Suggestion Pills */}
      <div id="search-cat-pills-row" className="flex items-center gap-1.5 overflow-x-auto pb-3 pr-1 shrink-0 select-none no-scrollbar">
        {CATEGORY_PILLS.map((pill) => {
          const PillIcon = pill.icon;
          return (
            <button
              id={`pill-${pill.id}`}
              key={pill.id}
              type="button"
              onClick={() => handlePillClick(pill.query)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-zinc-800 bg-zinc-950/40 text-[10px] text-zinc-400 hover:text-white hover:bg-zinc-800 whitespace-nowrap transition-all duration-200 cursor-pointer"
            >
              <PillIcon className="w-3.5 h-3.5 opacity-80" />
              {pill.label}
            </button>
          );
        })}
      </div>

      {/* Genre Exploration Header and grid */}
      <div id="genre-search-section" className="mb-4 shrink-0">
        <h4 className="text-[10px] font-mono uppercase text-zinc-500 tracking-wider mb-2 flex items-center gap-1.5 select-none">
          <Music className="w-3 h-3 text-emerald-400" />
          Cari & Jelajahi Berdasarkan Genre
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 select-none text-xs">
          {GENRE_ITEMS.map((g) => (
            <button
              id={`genre-${g.id}`}
              key={g.id}
              type="button"
              onClick={() => handlePillClick(g.query)}
              className="flex items-center gap-2 p-2 rounded-xl bg-zinc-950/40 hover:bg-zinc-800/60 border border-zinc-800/85 hover:border-emerald-500/25 text-zinc-300 hover:text-emerald-300 transition-all font-semibold cursor-pointer active:scale-95 duration-150"
            >
              <span className="text-sm scale-110 leading-none">{g.icon}</span>
              <span className="truncate text-[10px] tracking-wide">{g.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Results Title */}
      <div className="flex items-center justify-between mb-2">
        {currentPlaylist ? (
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-xs font-mono uppercase bg-emerald-500/10 text-emerald-400 px-2.5 py-1 rounded border border-emerald-500/20">
              <ListMusic className="w-3.5 h-3.5" />
              Playlist: {currentPlaylist.name}
            </span>
            {onClearPlaylistFilter && (
              <button
                type="button"
                onClick={onClearPlaylistFilter}
                className="flex items-center gap-1 text-[10px] bg-zinc-900 hover:bg-zinc-800 text-zinc-350 hover:text-white px-2 py-1 rounded cursor-pointer transition-all border border-zinc-800"
              >
                <X className="w-3 h-3 text-red-400" />
                Semua Lagu
              </button>
            )}
          </div>
        ) : (
          <h3 className="text-xs font-mono uppercase text-zinc-500 tracking-wider">
            {lastQuery ? `Katalog Temuan: "${lastQuery}"` : "Katalog Temuan"}
          </h3>
        )}
        {songs.length > 0 && (
          <span className="text-[10px] font-mono text-zinc-500">{songs.length} Track Siap Diputar</span>
        )}
      </div>

      {/* List Container */}
      <div id="search-results-viewport" className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[220px] md:max-h-[380px] min-h-[140px]">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-zinc-500 bg-zinc-950/20 rounded-2xl border border-zinc-800/20">
            <div className="p-3 bg-zinc-900 rounded-full animate-bounce">
              <Sparkles className="w-6 h-6 text-emerald-400 animate-pulse" />
            </div>
            <div className="text-center">
              <p className="text-xs font-semibold text-zinc-400">Menghubungkan ke Gemini AI...</p>
              <p className="text-[10px] text-zinc-650 tracking-wide mt-1">Menggali katalog musik & merancang sinyal instrumen chord</p>
            </div>
          </div>
        ) : songs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-zinc-500 bg-zinc-950/20 rounded-2xl border border-zinc-800/20">
            <Music className="w-8 h-8 text-zinc-700 mb-2 animate-pulse" />
            {currentPlaylist ? (
              <>
                <p className="text-xs uppercase font-mono tracking-wider text-emerald-400">Playlist Kosong</p>
                <p className="text-[10px] text-zinc-500 mt-1.5 text-center px-6 leading-relaxed max-w-sm">
                  Playlist ini belum memiliki lagu. Cari lagu favorit Anda di atas, ketuk tombol <span className="text-white font-bold font-mono">+</span> di kartu lagu untuk memasukkannya ke playlist!
                </p>
              </>
            ) : lastQuery ? (
              <>
                <p className="text-xs uppercase font-mono tracking-wider text-amber-500/90">Lagu Tidak Ditemukan</p>
                <p className="text-[10px] text-zinc-500 mt-1.5 text-center px-6 leading-relaxed max-w-xs">
                  Kami tidak menemukan kata kunci <span className="text-white font-mono">"{lastQuery}"</span>. Coba cari nama penyanyi terkenal (e.g. <span className="text-emerald-400/80">Tulus</span>, <span className="text-emerald-400/80">Coldplay</span>, <span className="text-emerald-400/80">Sheila On 7</span>) atau pakai tombol kategori di atas.
                </p>
              </>
            ) : (
              <>
                <p className="text-xs uppercase font-mono tracking-wider text-zinc-500">Katalog Tersedia</p>
                <p className="text-[10px] text-zinc-600 mt-1.5 text-center px-6 leading-relaxed max-w-xs">
                  Gunakan kolom pencarian di atas atau tombol kategori di atas untuk hasil instan.
                </p>
              </>
            )}
          </div>
        ) : (
          songs.map((song, idx) => {
            const isSongActive = activeSongId === song.id;
            return (
              <div
                id={`search-song-card-${song.id}`}
                key={`${song.id}-${idx}`}
                className={`p-3 rounded-xl border transition-all duration-300 flex items-center justify-between group ${
                  isSongActive
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-100"
                    : "bg-zinc-950/50 hover:bg-zinc-800/30 border-zinc-900/80 text-zinc-300"
                }`}
              >
                {/* Info and Play Panel */}
                <div
                  onClick={() => onPlaySong(song, songs)}
                  className="flex items-center gap-3 cursor-pointer min-w-0 flex-1"
                >
                  <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-zinc-900 flex-shrink-0 flex items-center justify-center">
                    {/* Generative Colored art representation */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-zinc-800 to-indigo-950 opacity-40" />
                    <img
                      src={song.albumArtUrl || `https://picsum.photos/seed/${song.albumArtSeed || song.id}/80/80`}
                      alt={song.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover relative z-10 transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20">
                      <Play className="w-4 h-4 text-white fill-white" />
                    </div>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold truncate group-hover:text-emerald-300 transition-colors flex items-center gap-1.5">
                      {song.title}
                      {isSongActive && (
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
                      )}
                    </div>
                    <div className="text-[10px] text-zinc-500 truncate flex items-center gap-1.5 mt-0.5">
                      <span>{song.artist}</span>
                      <span>•</span>
                      <span className="truncate">{song.album}</span>
                    </div>
                    {/* Badge and short AI Subtitle */}
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      <span className="text-[8px] font-mono uppercase bg-zinc-900 px-1.5 py-0.5 rounded text-zinc-400">
                        {song.genre}
                      </span>
                      <span className="text-[8px] font-mono bg-zinc-900 px-1.5 py-0.5 rounded text-zinc-400 capitalize flex items-center gap-0.5">
                        <Sparkles className="w-2.5 h-2.5 text-amber-400" />
                        {song.synthParams?.instrument || 'piano'}
                      </span>
                      <span className="text-[9px] text-zinc-500 italic truncate max-w-full">
                        {song.description}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right Actions Block */}
                <div className="flex items-center gap-2.5 ml-2 shrink-0 relative">
                  <span className="text-[10px] font-mono text-zinc-650">
                    {Math.floor(song.duration / 60)}:{(song.duration % 60).toString().padStart(2, '0')}
                  </span>

                  {/* Free MP3 Download options */}
                  <div className="flex items-center gap-1">
                    {/* SoundCloud Free Connection */}
                    <a
                      id={`btn-sc-${song.id}-${idx}`}
                      href={song.soundcloudUrl || `https://soundcloud.com/search?q=${encodeURIComponent(song.artist + ' ' + song.title)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-1.5 py-1 rounded text-[9px] font-bold bg-orange-600/10 hover:bg-orange-600/30 text-orange-400 border border-orange-500/20 hover:border-orange-500/40 transition-all cursor-pointer flex items-center justify-center gap-0.5"
                      title="Dengarkan Gratis di SoundCloud"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span className="text-[10px]">☁️</span> SC
                    </a>

                    {/* Audiomack Free Connection */}
                    <a
                      id={`btn-am-${song.id}-${idx}`}
                      href={song.audiomackUrl || `https://audiomack.com/search?q=${encodeURIComponent(song.artist + ' ' + song.title)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-1.5 py-1 rounded text-[9px] font-bold bg-amber-500/10 hover:bg-amber-500/30 text-amber-500 border border-amber-500/20 hover:border-amber-500/40 transition-all cursor-pointer flex items-center justify-center gap-0.5"
                      title="Dengarkan Gratis di Audiomack"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span className="text-[10px]">🍊</span> AM
                    </a>

                    {/* YouTube Integrated Player */}
                    <button
                      id={`btn-yt-embed-${song.id}-${idx}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onPlaySong(song, songs, 'youtube');
                      }}
                      className="px-1.5 py-1 rounded text-[9px] font-bold bg-red-600/15 hover:bg-red-600/30 text-red-500 border border-red-500/20 hover:border-red-500/45 transition-all cursor-pointer flex items-center justify-center gap-0.5"
                      title="Tonton video & lirik langsung di YouTube Player aplikasi (Tanpa keluar)"
                    >
                      <span className="text-[10px]">🔴</span> YT
                    </button>

                    {song.audioUrl && (
                      <>
                        <a
                          id={`btn-dl-sampel-${song.id}-${idx}`}
                          href={song.audioUrl}
                          download={`${song.artist} - ${song.title}.mp3`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg bg-zinc-900/80 hover:bg-emerald-950/40 text-emerald-400 hover:text-emerald-300 border border-emerald-500/10 hover:border-emerald-500/30 transition-all cursor-pointer flex items-center justify-center"
                          title="Unduh Sampel MP3 Gratis"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                        <a
                          id={`btn-dl-full-${song.id}-${idx}`}
                          href={`https://www.google.com/search?q=${encodeURIComponent(song.artist + ' ' + song.title + ' mp3 download gratis free')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg bg-zinc-900/80 hover:bg-amber-950/40 text-amber-500 hover:text-amber-400 border border-amber-500/10 hover:border-amber-500/30 transition-all cursor-pointer flex items-center justify-center"
                          title="Cari MP3 Lengkap Gratis"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </>
                    )}
                  </div>
                  
                  {/* Playlist Selector Dropdown */}
                  <div className="relative">
                    <button
                      id={`btn-toggle-playlist-drop-${song.id}-${idx}`}
                      onClick={(e) => handleTogglePlaylistDropdown(idx, e)}
                      className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-all cursor-pointer flex items-center justify-center"
                      title="Tambahkan ke Playlist"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>

                    {activeDropdownIndex === idx && (
                      <div
                        id={`playlist-dropdown-menu-${song.id}-${idx}`}
                        className="absolute right-0 mt-1 w-44 bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl p-1.5 z-50 text-xs text-zinc-300 space-y-1 animate-in fade-in slide-in-from-top-2 duration-150"
                      >
                        <p className="text-[9px] font-mono uppercase text-zinc-500 px-2 py-1 border-b border-zinc-900">MASUKKAN KE PLAYLIST</p>
                        {playlists.length === 0 ? (
                          <div className="p-2 text-center text-[10px] text-zinc-600 font-mono italic">
                            Belum ada playlist. Buat dulu di panel sebelah!
                          </div>
                        ) : (
                          playlists.map((pl) => (
                            <button
                              id={`btn-add-${song.id}-to-pl-${pl.id}`}
                              key={pl.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                onAddSongToPlaylist(pl.id, song);
                                setActiveDropdownIndex(null);
                              }}
                              className="w-full text-left p-1.5 hover:bg-emerald-500/10 hover:text-emerald-300 rounded-lg flex items-center gap-1.5 font-medium transition-colors cursor-pointer"
                            >
                              <Check className="w-3 h-3 opacity-60 text-emerald-400" />
                              <span className="truncate">{pl.name}</span>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>

              </div>
            );
          })
        )}
      </div>

    </div>
  );
}
