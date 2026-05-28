/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, FormEvent, MouseEvent } from "react";
import { Song, Playlist } from "../types.js";
import { Search, Sparkles, Plus, FolderPlus, Play, Check, Flame, Moon, Coffee, Heart, Music, Sun, Download, ExternalLink, X, ListMusic, ChevronDown, ChevronUp, Disc } from "lucide-react";

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
  
  // Album search state additions
  const [searchTarget, setSearchTarget] = useState<'track' | 'album'>('track');
  const [expandedAlbumKey, setExpandedAlbumKey] = useState<string | null>(null);
  const [albumTrackDropdownSongId, setAlbumTrackDropdownSongId] = useState<string | null>(null);

  // Group songs into unique Albums on-the-fly
  const groupedAlbums = (() => {
    const albumsMap: { [key: string]: { name: string; artist: string; artworkUrl?: string; artworkSeed?: string; year: number; songs: Song[] } } = {};
    
    songs.forEach(song => {
      const albumName = song.album || "Single / Album";
      const artistName = song.artist || "Artis Tidak Dikenal";
      const key = `${albumName.trim().toLowerCase()}|||${artistName.trim().toLowerCase()}`;
      if (!albumsMap[key]) {
        albumsMap[key] = {
          name: albumName,
          artist: artistName,
          artworkUrl: song.albumArtUrl,
          artworkSeed: song.albumArtSeed,
          year: song.year || new Date().getFullYear(),
          songs: []
        };
      }
      albumsMap[key].songs.push(song);
    });
    
    return Object.values(albumsMap);
  })();

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
      <form onSubmit={handleSubmit} className="relative mb-3 flex gap-2 w-full">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            id="input-main-search"
            type="text"
            placeholder={
              searchTarget === 'track'
                ? "Cari lagu, penyanyi, lirik, atau ketik mood (cth: 'lofi hujan')..."
                : "Cari nama album atau penyanyi (cth: 'Manusia', 'Tulus', 'X&Y')..."
            }
            value={searchField}
            onChange={(e) => setSearchField(e.target.value)}
            className="w-full text-xs p-3.5 pl-10 bg-zinc-950/80 rounded-xl border border-zinc-805 text-white focus:outline-none focus:border-emerald-500/50 transition-all placeholder-zinc-500 animate-in fade-in duration-200"
          />
        </div>
        <button
          id="btn-submit-main-search"
          type="submit"
          disabled={isLoading}
          className="px-4 py-2.5 rounded-xl bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 border border-emerald-500/30 font-semibold cursor-pointer text-xs disabled:opacity-50 transition-all shrink-0"
        >
          {isLoading ? "MENCARI..." : "CARI"}
        </button>
      </form>

      {/* Segmented Search Target Selector Tabs */}
      <div id="search-target-selector-tabs" className="grid grid-cols-2 gap-1.5 p-1 bg-zinc-950/80 rounded-xl border border-zinc-800/80 mb-4 shrink-0 select-none">
        <button
          id="tab-search-track"
          type="button"
          onClick={() => {
            setSearchTarget('track');
            setExpandedAlbumKey(null);
          }}
          className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-[10px] font-bold tracking-wider transition-all cursor-pointer ${
            searchTarget === 'track'
              ? "bg-emerald-500/10 border border-emerald-500/35 text-emerald-300 shadow-md"
              : "text-zinc-400 hover:text-zinc-200 border border-transparent hover:bg-zinc-900"
          }`}
        >
          <Music className="w-3.5 h-3.5" />
          🎵 LAGU & SINGLE
        </button>
        <button
          id="tab-search-album"
          type="button"
          onClick={() => {
            setSearchTarget('album');
            setExpandedAlbumKey(null);
          }}
          className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-[10px] font-bold tracking-wider transition-all cursor-pointer ${
            searchTarget === 'album'
              ? "bg-purple-500/10 border border-purple-500/35 text-purple-300 shadow-md"
              : "text-zinc-400 hover:text-zinc-200 border border-transparent hover:bg-zinc-900"
          }`}
        >
          <Disc className="w-3.5 h-3.5" />
          💿 ALBUM REKAMAN
        </button>
      </div>

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
            {lastQuery
              ? searchTarget === 'track'
                ? `Katalog Temuan: "${lastQuery}"`
                : `Album Temuan: "${lastQuery}"`
              : searchTarget === 'track'
              ? "Katalog Temuan"
              : "Album Temuan"}
          </h3>
        )}
        {songs.length > 0 && (
          <span className="text-[10px] font-mono text-zinc-500">
            {searchTarget === 'track'
              ? `${songs.length} Track`
              : `${groupedAlbums.length} Album`}{" "}
            Siap Diputar
          </span>
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
          <div className="flex flex-col items-center justify-center py-16 text-zinc-500 bg-zinc-950/20 rounded-2xl border border-zinc-800/20 animate-in fade-in duration-300">
            {searchTarget === 'track' ? <Music className="w-8 h-8 text-zinc-705 mb-2 animate-pulse" /> : <Disc className="w-8 h-8 text-zinc-705 mb-2 animate-spin-slow" />}
            {currentPlaylist ? (
              <>
                <p className="text-xs uppercase font-mono tracking-wider text-emerald-400">Playlist Kosong</p>
                <p className="text-[10px] text-zinc-500 mt-1.5 text-center px-6 leading-relaxed max-w-sm">
                  Playlist ini belum memiliki lagu. Cari lagu favorit Anda di atas, ketuk tombol <span className="text-white font-bold font-mono">+</span> di kartu lagu untuk memasukkannya ke playlist!
                </p>
              </>
            ) : lastQuery ? (
              <>
                <p className="text-xs uppercase font-mono tracking-wider text-amber-500/90">
                  {searchTarget === 'track' ? "Lagu Tidak Ditemukan" : "Album Tidak Ditemukan"}
                </p>
                <p className="text-[10px] text-zinc-500 mt-1.5 text-center px-6 leading-relaxed max-w-xs">
                  Kami tidak menemukan kata kunci <span className="text-white font-mono">"{lastQuery}"</span>. Coba cari nama penyanyi terkenal (e.g. <span className="text-emerald-400/80">Tulus</span>, <span className="text-emerald-400/80">Coldplay</span>, <span className="text-emerald-400/80">Sheila On 7</span>) atau pakai tombol kategori di atas.
                </p>
              </>
            ) : (
              <>
                <p className="text-xs uppercase font-mono tracking-wider text-zinc-500">
                  {searchTarget === 'track' ? "Katalog Tersedia" : "Daftar Album Tersedia"}
                </p>
                <p className="text-[10px] text-zinc-600 mt-1.5 text-center px-6 leading-relaxed max-w-xs">
                  Gunakan kolom pencarian di atas atau tombol kategori di atas untuk hasil instan.
                </p>
              </>
            )}
          </div>
        ) : searchTarget === 'album' ? (
          /* Album Grouped Results View */
          <div className="space-y-3 animate-in fade-in duration-300">
            {groupedAlbums.map((album, albumIdx) => {
              const albumKey = `${album.name.trim().toLowerCase()}|||${album.artist.trim().toLowerCase()}`;
              const isAlbumExpanded = expandedAlbumKey === albumKey;
              const albumIdSeed = album.songs[0]?.id || albumIdx.toString();

              return (
                <div
                  id={`search-album-card-${albumIdx}`}
                  key={albumKey}
                  className="rounded-xl border border-zinc-800/85 bg-zinc-950/40 overflow-hidden transition-all duration-300 hover:border-purple-500/30 shadow-lg"
                >
                  {/* Album Info Bar */}
                  <div
                    onClick={() => setExpandedAlbumKey(isAlbumExpanded ? null : albumKey)}
                    className={`p-3.5 flex items-center justify-between cursor-pointer hover:bg-zinc-800/15 active:bg-zinc-800/30 transition-all ${
                      isAlbumExpanded ? "bg-purple-950/5 border-b border-zinc-900/40" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0 pr-2">
                      {/* Album Art Cover with Turning Vinyl Indicator on Hover */}
                      <div className="relative group/art flex-shrink-0 select-none">
                        {/* CD/Vinyl sliding out background effect on hover */}
                        <div className="absolute right-[-3px] top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-zinc-950 border-4 border-zinc-800 shadow-md group-hover/art:translate-x-3 transition-transform duration-500 flex items-center justify-center z-0">
                          <div className="w-2.5 h-2.5 rounded-full bg-zinc-900 border border-zinc-700 animate-spin-slow" />
                        </div>
                        <img
                          src={album.artworkUrl || `https://picsum.photos/seed/${album.artworkSeed || albumIdSeed}/90/90`}
                          alt={album.name}
                          referrerPolicy="no-referrer"
                          className="w-10 h-10 rounded-lg object-cover relative z-10 border border-zinc-800 shadow-md transition-transform duration-500 group-hover/art:-translate-x-0.5"
                        />
                      </div>

                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-zinc-100 group-hover:text-purple-300 transition-colors truncate">
                          {album.name}
                        </h4>
                        <p className="text-[10px] text-zinc-450 truncate mt-0.5 flex items-center gap-1.5">
                          <span className="truncate">{album.artist}</span>
                          <span>•</span>
                          <span className="font-mono text-[9px] bg-zinc-950/80 px-1.5 py-0.2 rounded text-zinc-500">{album.year}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3.5 shrink-0">
                      <span className="text-[9px] font-mono font-bold uppercase text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20 select-none">
                        {album.songs.length} Track{album.songs.length > 1 ? 's' : ''}
                      </span>
                      
                      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        {/* Play entire playlist context of album */}
                        <button
                          onClick={() => {
                            if (album.songs.length > 0) {
                              onPlaySong(album.songs[0], album.songs);
                            }
                          }}
                          className="p-1 px-2.5 rounded-lg bg-purple-600/10 hover:bg-purple-600/30 text-purple-300 hover:text-white border border-purple-500/20 hover:border-purple-500/40 transition-all cursor-pointer text-[9px] font-bold flex items-center gap-1"
                          title="Putar Seluruh Album"
                        >
                          <Play className="w-3 h-3 fill-purple-300 hover:fill-white shrink-0" />
                          ALBUM
                        </button>
                        
                        {/* Toggle tracklist button */}
                        <button
                          onClick={() => {
                            setExpandedAlbumKey(isAlbumExpanded ? null : albumKey);
                          }}
                          className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-all cursor-pointer flex items-center justify-center border border-zinc-800/60"
                        >
                          {isAlbumExpanded ? <ChevronUp className="w-3.5 h-3.5 text-purple-300" /> : <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Dynamic Track List inside the Expanded Album */}
                  {isAlbumExpanded && (
                    <div className="border-t border-zinc-900 bg-zinc-950/80 p-2 space-y-1.5 animate-in slide-in-from-top-2 fade-in duration-200">
                      <div className="text-[9px] font-mono uppercase text-zinc-650 px-2.5 pt-1 flex justify-between items-center select-none pb-0.5">
                        <span>DAFTAR TRACKS</span>
                        <span>DAPAT DIPUTAR LANGSUNG</span>
                      </div>
                      
                      <div className="divide-y divide-zinc-900/60">
                        {album.songs.map((song, sIdx) => {
                          const isSongActive = activeSongId === song.id;
                          return (
                            <div
                              id={`album-song-row-${song.id}`}
                              key={song.id}
                              onClick={() => onPlaySong(song, album.songs)}
                              className={`p-2 py-2.5 rounded-lg cursor-pointer transition-all flex items-center justify-between text-xs group ${
                                isSongActive
                                  ? "bg-purple-500/10 border-l-2 border-purple-500 text-purple-100"
                                  : "hover:bg-zinc-908/40 text-zinc-400 hover:text-zinc-200"
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                                <span className="text-[9px] font-mono text-zinc-600 w-3.5 select-none font-semibold">
                                  {(sIdx + 1).toString().padStart(2, '0')}
                                </span>
                                <div className="truncate min-w-0">
                                  <div className="font-semibold text-xs truncate group-hover:text-purple-300 transition-colors flex items-center gap-1.5">
                                    {song.title}
                                    {isSongActive && <span className="h-1.5 w-1.5 rounded-full bg-purple-400 animate-ping inline-block" />}
                                  </div>
                                  <div className="flex items-center gap-1.5 mt-1 select-none flex-wrap">
                                    <span className="text-[8px] font-mono bg-zinc-900/60 px-1 py-0.2 rounded text-zinc-500 border border-zinc-800/40">
                                      {song.genre}
                                    </span>
                                    {song.synthParams?.instrument && (
                                      <span className="text-[8px] font-mono bg-zinc-900/60 px-1 py-0.2 rounded text-zinc-500 capitalize">
                                        🎹 {song.synthParams.instrument}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 ml-1 shrink-0 relative" onClick={(e) => e.stopPropagation()}>
                                <span className="text-[10px] font-mono text-zinc-650 mr-1 selection:bg-transparent">
                                  {Math.floor(song.duration / 60)}:{(song.duration % 60).toString().padStart(2, '0')}
                                </span>

                                <div className="flex items-center gap-1">
                                  {/* SC Button */}
                                  <a
                                    href={song.soundcloudUrl || `https://soundcloud.com/search?q=${encodeURIComponent(song.artist + ' ' + song.title)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-1 py-0.5 rounded text-[8px] font-bold bg-orange-600/10 hover:bg-orange-600/30 text-orange-400 border border-orange-500/20 transition-all cursor-pointer"
                                    title="Dengarkan Gratis di SoundCloud"
                                  >
                                    SC
                                  </a>

                                  {/* AM Button */}
                                  <a
                                    href={song.audiomackUrl || `https://audiomack.com/search?q=${encodeURIComponent(song.artist + ' ' + song.title)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-1 py-0.5 rounded text-[8px] font-bold bg-amber-500/10 hover:bg-amber-500/30 text-amber-500 border border-amber-500/20 transition-all cursor-pointer"
                                    title="Dengarkan Gratis di Audiomack"
                                  >
                                    AM
                                  </a>

                                  {/* YT Player Button */}
                                  <button
                                    onClick={() => onPlaySong(song, album.songs, 'youtube')}
                                    className="px-1 py-0.5 rounded text-[8px] font-bold bg-red-600/15 hover:bg-red-600/30 text-red-500 border border-red-500/20 transition-all cursor-pointer"
                                    title="Tonton video & lirik langsung di YouTube Player"
                                  >
                                    YT
                                  </button>
                                </div>

                                {/* Add to Playlist inside Album */}
                                <div className="relative ml-1">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setAlbumTrackDropdownSongId(albumTrackDropdownSongId === song.id ? null : song.id);
                                    }}
                                    className="p-1 rounded bg-zinc-900 border border-zinc-800/80 text-zinc-400 hover:text-white transition-all cursor-pointer flex items-center justify-center hover:bg-zinc-800"
                                    title="Tambahkan ke Playlist"
                                  >
                                    <Plus className="w-3 h-3" />
                                  </button>

                                  {albumTrackDropdownSongId === song.id && (
                                    <div
                                      className="absolute right-0 mt-1 w-44 bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl p-1.5 z-50 text-xs text-zinc-300 space-y-1 animate-in fade-in slide-in-from-top-2 duration-150"
                                    >
                                      <p className="text-[9px] font-mono uppercase text-zinc-500 px-2 py-1 border-b border-zinc-900">MASUKKAN KE PLAYLIST</p>
                                      {playlists.length === 0 ? (
                                        <div className="p-2 text-center text-[10px] text-zinc-650 font-mono italic">
                                          Belum ada playlist. Buat dulu di panel sebelah!
                                        </div>
                                      ) : (
                                        playlists.map((pl) => (
                                          <button
                                            key={pl.id}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              onAddSongToPlaylist(pl.id, song);
                                              setAlbumTrackDropdownSongId(null);
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
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          /* Standard Song Results View (Original Map) */
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
                          <div className="p-2 text-center text-[10px] text-zinc-650 font-mono italic">
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
