/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, FormEvent } from "react";
import { Playlist, Song } from "../types.js";
import { Plus, ListMusic, Trash2, Calendar, Sparkles, X, ChevronRight, Music } from "lucide-react";

interface PlaylistManagerProps {
  playlists: Playlist[];
  currentPlaylist: Playlist | null;
  onSelectPlaylist: (playlist: Playlist | null) => void;
  onCreatePlaylist: (name: string, desc?: string) => void;
  onDeletePlaylist: (id: string) => void;
  onRemoveSongFromPlaylist: (playlistId: string, songId: string) => void;
  onPlaySong: (song: Song, playlistContext?: Song[], forceMode?: 'mp3' | 'synth' | 'youtube') => void;
  onAskAISuggestions: (playlist: Playlist) => void;
  isSuggesting: boolean;
}

export default function PlaylistManager({
  playlists,
  currentPlaylist,
  onSelectPlaylist,
  onCreatePlaylist,
  onDeletePlaylist,
  onRemoveSongFromPlaylist,
  onPlaySong,
  onAskAISuggestions,
  isSuggesting
}: PlaylistManagerProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [newPlaylistDesc, setNewPlaylistDesc] = useState("");

  const handleSubmitCreate = (e: FormEvent) => {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;
    onCreatePlaylist(newPlaylistName.trim(), newPlaylistDesc.trim());
    setNewPlaylistName("");
    setNewPlaylistDesc("");
    setShowCreateModal(false);
  };

  return (
    <div id="playlist-manager" className="flex flex-col h-full bg-zinc-900/60 rounded-2xl border border-zinc-800 p-4 transition-all duration-300">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-semibold text-zinc-300 tracking-wide uppercase flex items-center gap-2">
          <ListMusic className="w-4 h-4 text-emerald-400 animate-pulse" />
          Daftar Putar Pribadi
        </h3>
        <button
          id="btn-open-create-playlist"
          onClick={() => setShowCreateModal(true)}
          className="p-1 px-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white transition-all text-xs flex items-center gap-1 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          Baru
        </button>
      </div>

      {showCreateModal && (
        <div id="create-playlist-modal" className="mb-4 p-3 bg-zinc-950/80 rounded-xl border border-zinc-800/80 transition-all duration-300">
          <form onSubmit={handleSubmitCreate} className="space-y-3">
            <div>
              <label className="block text-[10px] font-mono uppercase text-zinc-500 mb-1">Nama Playlist</label>
              <input
                id="input-playlist-name"
                type="text"
                required
                placeholder="cth: Santai Sore, Lofi Belajar..."
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                className="w-full text-xs p-2 bg-zinc-900 rounded-lg border border-zinc-800 text-white focus:outline-none focus:border-emerald-500/50"
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono uppercase text-zinc-500 mb-1">Deskripsi Tambahan (Opsional)</label>
              <textarea
                id="input-playlist-desc"
                placeholder="Sedikit cerita tentang playlist ini..."
                value={newPlaylistDesc}
                onChange={(e) => setNewPlaylistDesc(e.target.value)}
                rows={2}
                className="w-full text-xs p-2 bg-zinc-900 rounded-lg border border-zinc-800 text-white focus:outline-none focus:border-emerald-500/50 resize-none"
              />
            </div>
            <div className="flex justify-end gap-2 text-xs">
              <button
                id="btn-close-playlist-modal"
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-2.5 py-1.5 rounded-lg bg-zinc-900 text-zinc-400 hover:text-zinc-200 font-mono text-[10px] cursor-pointer"
              >
                BATAL
              </button>
              <button
                id="btn-submit-playlist-modal"
                type="submit"
                className="px-2.5 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/30 font-semibold cursor-pointer"
              >
                BUAT PLAYLIST
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Playlist List Panel */}
      <div className="space-y-2 overflow-y-auto max-h-[160px] md:max-h-[220px] flex-shrink-0 pr-1 select-none">
        <div
          id="playlist-library-all"
          onClick={() => onSelectPlaylist(null)}
          className={`p-2.5 rounded-xl flex items-center justify-between cursor-pointer transition-all ${
            currentPlaylist === null
              ? "bg-zinc-800 text-white border-l-2 border-emerald-400"
              : "text-zinc-400 hover:bg-zinc-800/40 hover:text-zinc-100"
          }`}
        >
          <div className="flex items-center gap-2">
            <Music className="w-3.5 h-3.5" />
            <div className="text-xs font-medium">Semua Lagu Terbuka</div>
          </div>
          <ChevronRight className="w-3 h-3 opacity-60" />
        </div>

        {playlists.length === 0 ? (
          <div className="text-center py-6 text-zinc-600 border border-dashed border-zinc-800 rounded-xl">
            <p className="text-[11px] font-mono uppercase mb-0.5">ALBUM KOSONG</p>
            <p className="text-[10px] scale-95 opacity-80">Buat playlist untuk merapikan lagu favorit.</p>
          </div>
        ) : (
          playlists.map((pl) => (
            <div
              id={`playlist-item-${pl.id}`}
              key={pl.id}
              onClick={() => onSelectPlaylist(pl)}
              className={`p-2.5 rounded-xl flex items-center justify-between cursor-pointer group transition-all ${
                currentPlaylist?.id === pl.id
                  ? "bg-emerald-500/10 text-emerald-200 border-l-2 border-emerald-400"
                  : "text-zinc-400 hover:bg-zinc-800/40 hover:text-zinc-100"
              }`}
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <div className="p-1 rounded-md bg-zinc-950/60 flex items-center justify-center">
                  <ListMusic className="w-3.5 h-3.5 text-zinc-300 group-hover:text-emerald-300" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold truncate">{pl.name}</div>
                  <div className="text-[9px] font-mono text-zinc-500 flex items-center gap-1.5">
                    <span>{pl.songs.length} lagu</span>
                    <span>•</span>
                    <span className="flex items-center gap-0.5"><Calendar className="w-2.5 h-2.5" />{new Date(pl.createdAt).toLocaleDateString("id-ID", { month: "short", day: "numeric" })}</span>
                  </div>
                </div>
              </div>
              <button
                id={`btn-delete-playlist-${pl.id}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onDeletePlaylist(pl.id);
                }}
                className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-zinc-800 text-zinc-500 hover:text-rose-400 transition-all cursor-pointer mr-1"
                title="Hapus Playlist"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Playlist Active Songs detail */}
      {currentPlaylist && (
        <div id="current-playlist-detail-block" className="mt-4 border-t border-zinc-800/80 pt-3 flex flex-col flex-1 min-h-0">
          <div className="flex justify-between items-start mb-2 gap-2">
            <div>
              <h4 className="text-xs font-bold text-zinc-200">{currentPlaylist.name}</h4>
              <p className="text-[10px] text-zinc-500 mt-0.5 italic">{currentPlaylist.description || "Tidak ada deskripsi."}</p>
            </div>
            {currentPlaylist.songs.length > 0 && (
              <button
                id="btn-ai-auto-playlist"
                onClick={() => onAskAISuggestions(currentPlaylist)}
                disabled={isSuggesting}
                className="flex items-center gap-1 text-[10px] bg-gradient-to-r from-teal-500/20 to-emerald-500/20 hover:from-teal-500/30 hover:to-emerald-500/30 text-emerald-300 border border-emerald-500/30 px-2 py-1 rounded-md transition-all font-semibold disabled:opacity-50 cursor-pointer"
                title="Saran pelengkap lagu otomatis dari Gemini"
              >
                <Sparkles className={`w-3 h-3 ${isSuggesting ? 'animate-spin' : ''}`} />
                {isSuggesting ? "MEMROSES..." : "SARAN AI"}
              </button>
            )}
          </div>

          <div className="overflow-y-auto flex-1 h-[140px] space-y-1.5 pr-1">
            {currentPlaylist.songs.length === 0 ? (
              <div className="text-center py-8 text-zinc-600 border border-dashed border-zinc-800 rounded-xl my-2">
                <p className="text-[10px] font-mono uppercase mb-0.5">KOSONG</p>
                <p className="text-[9px] px-4 opacity-80">Cari lagu lewat pencarian di atas lalu klik tanda "+" untuk memasukkan ke playlist ini.</p>
              </div>
            ) : (
              currentPlaylist.songs.map((song, idx) => (
                <div
                  id={`playlist-song-row-${song.id}`}
                  key={`${song.id}-${idx}`}
                  onClick={() => onPlaySong(song, currentPlaylist.songs)}
                  className="group/song p-1.5 rounded-lg bg-zinc-950/40 hover:bg-zinc-800/30 flex items-center justify-between text-xs cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="text-[9px] font-mono text-zinc-500 w-4 text-center group-hover/song:text-emerald-400">
                      {idx + 1}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-zinc-300 truncate group-hover/song:text-white">{song.title}</div>
                      <div className="text-[10px] text-zinc-500 truncate">{song.artist}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {/* YouTube Integrated Player */}
                    <button
                      id={`btn-yt-embed-playlist-${song.id}-${idx}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onPlaySong(song, currentPlaylist.songs, 'youtube');
                      }}
                      className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-600/15 hover:bg-red-600/35 text-red-400 border border-red-500/15 transition-all cursor-pointer flex items-center justify-center gap-0.5"
                      title="Tonton video & lirik langsung di YouTube Player aplikasi (Tanpa keluar)"
                    >
                      <span className="text-[10px]">🔴</span> YT
                    </button>

                    <span className="text-[10px] font-mono text-zinc-600">
                      {Math.floor(song.duration / 60)}:{(song.duration % 60).toString().padStart(2, '0')}
                    </span>
                    <button
                      id={`btn-remove-song-${song.id}-${idx}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveSongFromPlaylist(currentPlaylist.id, song.id);
                      }}
                      className="opacity-0 group-hover/song:opacity-100 p-1 text-zinc-500 hover:text-rose-400 rounded-md hover:bg-zinc-850 cursor-pointer"
                      title="Keluarkan dari playlist"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
