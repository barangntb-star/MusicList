/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useEffect, MouseEvent, FormEvent } from "react";
import { ChatMessage, Song, Playlist } from "../types.js";
import { Send, Sparkles, Plus, Check, Play, User, Music, HelpCircle, ArrowRight } from "lucide-react";

interface LiveChatCompanionProps {
  playlists: Playlist[];
  onAddSongToPlaylist: (playlistId: string, song: Song) => void;
  onPlaySong: (song: Song) => void;
}

const SMART_SUGGESTIONS = [
  "Rekomendasikan lagu Indie Indonesia bernada senja",
  "Jelaskan arti lagu 'Hati-Hati di Jalan' secara mendalam",
  "Buat daftar lagu Synthwave berenergi tinggi untuk koding",
];

export default function LiveChatCompanion({
  playlists,
  onAddSongToPlaylist,
  onPlaySong
}: LiveChatCompanionProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      sender: "assistant",
      text: "Halo! Saya **Rara**, Asisten Musik pintar Anda. 🎧✨\n\nAda lagu atau lirik tertentu yang ingin kita bedah maknanya? Atau butuh rekomendasi daftar putar istimewa sesuai suasana hati Anda? Silakan tanya saya apa saja!",
      timestamp: new Date().toLocaleTimeString("id", { hour: "2-digit", minute: "2-digit" })
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeDropdownMsgId, setActiveDropdownMsgId] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to latest chat node
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: `m-${Date.now()}-usr`,
      sender: "user",
      text: textToSend,
      timestamp: new Date().toLocaleTimeString("id", { hour: "2-digit", minute: "2-digit" })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: textToSend,
          history: messages.map(m => ({
            role: m.sender === "user" ? "user" : "model",
            text: m.text
          }))
        })
      });

      const data = await response.json();
      if (response.ok && data.text) {
        const assistantMsg: ChatMessage = {
          id: `m-${Date.now()}-ast`,
          sender: "assistant",
          text: data.text,
          timestamp: new Date().toLocaleTimeString("id", { hour: "2-digit", minute: "2-digit" })
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } else {
        throw new Error(data.error || "Gagal mendapatkan balasan dari AI.");
      }
    } catch (err: any) {
      console.error("Chat Error:", err);
      const errorMsg: ChatMessage = {
        id: `m-${Date.now()}-err`,
        sender: "assistant",
        text: "Maaf kawan, piringan hitam saya agak macet sejenak. 🎶 Gagal memproses permintaan chat Anda. Pastikan koneksi aman atau coba beralih sekejap.",
        timestamp: new Date().toLocaleTimeString("id", { hour: "2-digit", minute: "2-digit" })
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  // Extract text and attachments separately from Assistant messages
  const parseMessageContent = (messageText: string) => {
    const jsonRegex = /```json-attachment([\s\S]*?)```/;
    const match = messageText.match(jsonRegex);
    
    let cleanText = messageText;
    let attachedSongs: Song[] = [];

    if (match) {
      cleanText = messageText.replace(jsonRegex, "").trim();
      try {
        attachedSongs = JSON.parse(match[1].trim());
      } catch (e) {
        console.error("Failed to parse attached songs:", e);
      }
    }

    return { cleanText, attachedSongs };
  };

  const handleToggleAddDropdown = (msgId: string, e: MouseEvent) => {
    e.stopPropagation();
    if (activeDropdownMsgId === msgId) {
      setActiveDropdownMsgId(null);
    } else {
      setActiveDropdownMsgId(msgId);
    }
  };

  return (
    <div id="companion-chat" className="flex flex-col h-full bg-zinc-900/60 rounded-2xl border border-zinc-800 p-4 min-h-[300px]">
      
      {/* Companion Title panel */}
      <div className="flex items-center gap-2 pb-3 border-b border-zinc-800 mb-3 shrink-0">
        <div className="relative">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-violet-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shadow-lg shadow-indigo-500/10">
            DJ
          </div>
          <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-zinc-900" />
        </div>
        <div>
          <h3 className="text-xs font-bold text-zinc-100 flex items-center gap-2">
            Rara, DJ Virtual AI
          </h3>
          <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest leading-none block">Disk Jockey Terpadu</span>
        </div>
      </div>

      {/* Messages viewport */}
      <div id="companion-messages" className="flex-1 overflow-y-auto space-y-4 pr-1 mb-3 max-h-[180px] md:max-h-[320px]">
        {messages.map((msg) => {
          const isUser = msg.sender === "user";
          const { cleanText, attachedSongs } = parseMessageContent(msg.text);

          return (
            <div
              id={`chat-bubble-row-${msg.id}`}
              key={msg.id}
              className={`flex items-start gap-2.5 ${isUser ? "flex-row-reverse" : ""}`}
            >
              {/* Avatar circle */}
              <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                isUser ? "bg-zinc-800 text-zinc-300" : "bg-gradient-to-br from-violet-500/20 to-indigo-500/20 text-indigo-400 border border-indigo-500/20"
              }`}>
                {isUser ? <User className="w-3.5 h-3.5" /> : <Music className="w-3.5 h-3.5 text-violet-400 animate-pulse" />}
              </div>

              {/* Message Capsule */}
              <div className="max-w-[85%]">
                <div className={`p-2.5 rounded-2xl text-xs leading-relaxed break-words shadow-sm ${
                  isUser
                    ? "bg-emerald-500/15 text-emerald-100 border border-emerald-500/20 rounded-tr-none"
                    : "bg-zinc-950 border border-zinc-850 text-zinc-300 rounded-tl-none whitespace-pre-wrap"
                }`}>
                  {/* Basic markup formatting helper */}
                  {cleanText.includes("**") ? (
                    <span dangerouslySetInnerHTML={{
                      __html: cleanText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                    }} />
                  ) : (
                    <span>{cleanText}</span>
                  )}

                  {/* Attachment Cards panel inside bubble if suggestions are attached */}
                  {attachedSongs.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-zinc-900/80 space-y-2">
                      <p className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles className="w-3 h-3 text-amber-400" />
                        Rekomendasi Terlampir
                      </p>
                      <div className="space-y-1.5">
                        {attachedSongs.map((song, idx) => (
                          <div
                            id={`attached-song-${song.id}-${idx}`}
                            key={`${song.id}-${idx}`}
                            className="p-2 rounded-xl bg-zinc-900 border border-zinc-850 hover:border-zinc-700 flex items-center justify-between text-xs transition-colors"
                          >
                            <div className="min-w-0 pr-2">
                              <div className="font-bold text-zinc-200 truncate flex items-center gap-1">
                                {song.title}
                                <span className="text-[7px] font-mono text-zinc-500 bg-zinc-950 px-1 py-0.5 rounded capitalize">
                                  {song.synthParams.instrument}
                                </span>
                              </div>
                              <div className="text-[10px] text-zinc-500 truncate">{song.artist}</div>
                              <div className="text-[9px] text-zinc-600 truncate italic mt-0.5">{song.description}</div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                id={`attached-play-${song.id}`}
                                onClick={() => onPlaySong(song)}
                                className="p-1 rounded-md bg-zinc-950 hover:bg-zinc-800 text-zinc-300 hover:text-white cursor-pointer"
                                title="Play Track"
                              >
                                <Play className="w-3 h-3 fill-white text-white" />
                              </button>
                              
                              <div className="relative">
                                <button
                                  id={`attached-add-toggle-${song.id}-${idx}`}
                                  onClick={(e) => handleToggleAddDropdown(`${msg.id}-${song.id}`, e)}
                                  className="p-1 rounded-md bg-zinc-950 hover:bg-zinc-800 text-zinc-400 hover:text-white cursor-pointer"
                                  title="Tambahkan Ke Playlist"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>

                                {activeDropdownMsgId === `${msg.id}-${song.id}` && (
                                  <div className="absolute right-0 mt-1 w-36 bg-zinc-950 border border-zinc-800 rounded-lg shadow-2xl p-1 z-50 text-[10px] space-y-0.5">
                                    {playlists.length === 0 ? (
                                      <p className="p-1.5 text-center text-[9px] text-zinc-600 font-mono">Buat playlist dahulu.</p>
                                    ) : (
                                      playlists.map(pl => (
                                        <button
                                          id={`attach-add-${song.id}-to-pl-${pl.id}`}
                                          key={pl.id}
                                          onClick={() => {
                                            onAddSongToPlaylist(pl.id, song);
                                            setActiveDropdownMsgId(null);
                                          }}
                                          className="w-full text-left p-1 hover:bg-emerald-500/10 hover:text-emerald-300 rounded flex items-center gap-1.5 truncate cursor-pointer text-zinc-400 font-semibold"
                                        >
                                          <Check className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
                                          <span className="truncate">{pl.name}</span>
                                        </button>
                                      ))
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
                {/* Time footer bubble */}
                <span className={`text-[8px] font-mono text-zinc-600 mt-1 block px-1.5 ${isUser ? "text-right" : ""}`}>
                  {msg.timestamp}
                </span>
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex items-start gap-2.5">
            <div className="w-6 h-6 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/20">
              <Sparkles className="w-3.5 h-3.5 text-violet-400 animate-spin" />
            </div>
            <div className="bg-zinc-950 border border-zinc-850 p-2.5 rounded-2xl text-xs text-zinc-500 italic flex items-center gap-1.5 max-w-[280px]">
              <span className="inline-flex gap-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-700 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-700 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-700 animate-bounce" style={{ animationDelay: '300ms' }} />
              </span>
              DJ Rara sedang memikirkan lagu pas...
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Suggested prompts helper bottom rail */}
      <div id="smart-prompts-helper" className="space-y-1.5 mb-2.5 shrink-0 select-none">
        <div className="text-[9px] font-mono uppercase text-zinc-600 flex items-center gap-1">
          <HelpCircle className="w-3 h-3 text-zinc-600" />
          Ketik contoh pertanyaan berikut:
        </div>
        <div className="flex flex-col gap-1">
          {SMART_SUGGESTIONS.map((promptText, i) => (
            <button
              id={`chat-smart-prompt-${i}`}
              key={i}
              type="button"
              onClick={() => handleSendMessage(promptText)}
              className="w-full text-left p-1.5 px-2 bg-zinc-950/60 hover:bg-zinc-800/30 text-[10px] text-zinc-400 hover:text-zinc-200 rounded-lg flex items-center justify-between group transition-colors cursor-pointer border border-zinc-900"
            >
              <span className="truncate pr-1.5 font-medium">{promptText}</span>
              <ArrowRight className="w-3 h-3 text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          ))}
        </div>
      </div>

      {/* Prompt input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage(input);
        }}
        className="flex gap-2 shrink-0 mt-auto"
      >
        <input
          id="input-companion-prompt"
          type="text"
          disabled={isLoading}
          placeholder="Tanya arti lirik atau rekomendasikan lagu..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 text-xs p-2.5 bg-zinc-950/80 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-violet-500/50 placeholder-zinc-650"
        />
        <button
          id="btn-send-companion-msg"
          type="submit"
          disabled={!input.trim() || isLoading}
          className="p-2.5 px-3.5 bg-gradient-to-tr from-violet-600 to-indigo-600 opacity-90 text-white rounded-xl font-semibold hover:opacity-100 text-xs flex items-center justify-center transition-all disabled:opacity-30 cursor-pointer"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>

    </div>
  );
}
