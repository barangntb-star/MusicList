/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express, { Request, Response } from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";
import { Song, LyricsData } from "./src/types.js";

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini Client Lazily/Safely
let aiClient: GoogleGenAI | null = null;
let geminiCooldownUntil = 0;

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    // Graceful fallback helper: key is not configured, we'll use offline mode
    return null;
  }
  
  // Circuit breaker rate-limit check
  if (Date.now() < geminiCooldownUntil) {
    const secondsLeft = Math.ceil((geminiCooldownUntil - Date.now()) / 1000);
    console.log(`[Circuit Breaker] Gemini API is cooling down due to 429 quota limits. Serving offline mode directly. (${secondsLeft}s remaining)`);
    return null;
  }
  
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });
  }
  return aiClient;
}

// Helper to trigger circuit breaker on 429/quota error
function handleGeminiError(error: any, contextDescription = "API Call") {
  const errorStr = typeof error === 'object' ? JSON.stringify(error) : String(error);
  
  // Clean, descriptive log of the error instead of flooding with large stack traces
  console.log(`[Gemini Error - ${contextDescription}]:`, error.message || errorStr.substring(0, 500));
  
  // Detect rate limits or resource exhaustion
  const isQuotaExceeded = 
    errorStr.includes("RESOURCE_EXHAUSTED") || 
    errorStr.includes("Quota exceeded") || 
    errorStr.includes("quota");
    
  const isRateLimit = 
    errorStr.includes("429") || 
    errorStr.includes("rate-limits") ||
    isQuotaExceeded ||
    (error && (error.status === "RESOURCE_EXHAUSTED" || error.code === 429));
    
  if (isRateLimit) {
    // If daily quota is fully exhausted, put on continuous cooldown for 30 minutes
    const cooldownMs = isQuotaExceeded ? 1800000 : 90000;
    geminiCooldownUntil = Date.now() + cooldownMs;
    const minutes = Math.ceil(cooldownMs / 60000);
    console.warn(`⚠️ [Circuit Breaker TRIGGERED] Gemini API rate limit or Quota exhausted during ${contextDescription}. Cooldown activated for ${minutes} minutes to prevent failing outbound requests.`);
  }
}

// ----------------------------------------------------
// OFFLINE FALLBACK DATABASE (High-Quality Content)
// ----------------------------------------------------
const FALLBACK_SONGS: Song[] = [
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
    id: "retro-sunrise-vibe",
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
  },
  {
    id: "someone-like-you-adele",
    title: "Someone Like You",
    artist: "Adele",
    album: "21",
    year: 2011,
    genre: "Soul / Pop",
    duration: 285,
    mood: "Melankolis",
    description: "Sebuah balada piano yang merasuki hati tentang melepaskan cinta masa lalu demi kebahagiaannya.",
    synthParams: {
      tempo: 68,
      key: "G Major",
      progression: ["G", "D", "Em", "C"],
      instrument: "piano"
    },
    albumArtSeed: "adele-someone"
  },
  {
    id: "midnight-city-run",
    title: "Neon Horizon",
    artist: "Synthwave Pulse",
    album: "Vector Highway",
    year: 2021,
    genre: "Synthwave / Electronic",
    duration: 210,
    mood: "Bersemangat / Futuristik",
    description: "Adrenalin synth instrumental tempo cepat berkendara malam hari melintasi kota neon fiksi.",
    synthParams: {
      tempo: 115,
      key: "A Minor",
      progression: ["Am", "G", "F", "E"],
      instrument: "synthwave"
    },
    albumArtSeed: "neon-horizon"
  },
  {
    id: "fly-me-to-the-moon",
    title: "Fly Me to the Moon",
    artist: "Frank Sinatra",
    album: "It Might as Well Be Swing",
    year: 1964,
    genre: "Traditional Jazz",
    duration: 147,
    mood: "Romantis / Ceria",
    description: "Klasik swing elegan yang melambangkan kebahagiaan tak berujung dari rasa jatuh cinta.",
    synthParams: {
      tempo: 120,
      key: "A Minor",
      progression: ["Am7", "Dm7", "G7", "Cmaj7"],
      instrument: "piano"
    },
    albumArtSeed: "sinatra-moon"
  }
];

const FALLBACK_LYRICS: Record<string, LyricsData> = {
  "hati-hati-di-jalan-tulus": {
    lyrics: `Perjalanan membawamu\nBertemu denganku\nKu bertemu kamu\n\nSebuah perjalanan yang indah\nYang kini harus disudahi\n\nKira-kira begitulah\nSemua kisah perjumpaan pasti ada perpisahan\nKini kita harus melangkah masing-masing\n\nSemoga kita kuat\nMenghadapi hari-hari baru tanpa kita bersama\n\nKukira kita akan bersama\nBegitu banyak kesamaan\nKukira kita akan menua bersama\nTiba-tiba takdir berkata berbeda\n\nHati-hati di jalan...\nHati-hati di jalan...\nSemoga lekas bahagia`,
    translationAvailable: false,
    translation: null,
    meaning: "Lagu ini bermakna tentang kedewasaan dalam melepas ikatan kasih. Meskipun sempat merasa yakin bahwa mereka berjodoh karena banyak kesamaan, takdir memisahkan mereka. Alih-alih marah, ia memberikan doa yang tulus agar sang mantan selalu berhati-hati dan bahagia di perjalannya.",
    syncedLyrics: [
      { time: 0, text: "🎵 [Piano Instrumental Intro]" },
      { time: 10, text: "Perjalanan membawamu..." },
      { time: 18, text: "Bertemu denganku, ku bertemu kamu" },
      { time: 26, text: "Sebuah perjalanan yang indah" },
      { time: 34, text: "Yang kini harus disudahi..." },
      { time: 42, text: "Kira-kira begitulah kisah kita" },
      { time: 50, text: "Setiap kisah pasti ada perpisahan" },
      { time: 58, text: "Kini kita harus melangkah masing-masing" },
      { time: 70, text: "Semoga kita berdua kuat..." },
      { time: 78, text: "Menghadapi hari baru tanpa kita bersama" },
      { time: 88, text: "Kukira kita akan bersama selamanya" },
      { time: 98, text: "Begitu banyak kecocokan kesamaan" },
      { time: 108, text: "Kukira kita akan menua bersama..." },
      { time: 118, text: "Namun takdir berkata berbeda" },
      { time: 130, text: "Hati-hati di jalan..." },
      { time: 140, text: "Hati-hati di jalan..." },
      { time: 155, text: "Semoga lekas bahagia" },
      { time: 175, text: "🎵 [Melodi Piano Outro yang Lembut]" }
    ]
  },
  "fix-you-coldplay": {
    lyrics: `When you try your best, but you don't succeed\nWhen you get what you want, but not what you need\nWhen you feel so tired, but you can't sleep\nStuck in reverse\n\nAnd the tears come streaming down your face\nWhen you lose something you can't replace\nWhen you love someone, but it goes to waste\nCould it be worse?\n\nLights will guide you home\nAnd ignite your bones\nAnd I will try to fix you`,
    translationAvailable: true,
    translation: `Ketika kau berusaha sebaik mungkin, namun tak berhasil\nKetika kau mendapatkan apa yang kau mau, tapi bukan yang kau butuh\nKetika kau merasa begitu lelah, namun tak bisa terlelap\nTertahan di posisi mundur\n\nDan air mata mengalir deras membasahi wajahmu\nKetika kau kehilangan sesuatu yang tak tergantikan\nKetika kau mencintai seseorang, namun sia-sia\nMungkinkah lebih buruk lagi?\n\nCahaya akan menuntunmu pulang\nDan menyalakan semangat di ragamu\nDan aku akan mencoba memulihkanmu`,
    meaning: "Lagu romantis-empiris ini mengeksplorasi perasaan duka yang mendalam saat kita tidak sanggup membantu orang yang kita cintai saat mereka jatuh. Refrain 'Lights will guide you home' memberikan pesan esensial bahwa selalu ada harapan di tengah kegelapan dan cinta sejati akan selalu menuntun kita kembali bugar.",
    syncedLyrics: [
      { time: 0, text: "🎵 [Ambient Synths Intro]" },
      { time: 12, text: "When you try your best, but you don't succeed..." },
      { time: 24, text: "When you get what you want, but not what you need" },
      { time: 36, text: "When you feel so tired, but you can't sleep" },
      { time: 48, text: "Stuck in reverse..." },
      { time: 60, text: "And the tears come streaming down your face" },
      { time: 72, text: "When you lose something you can't replace" },
      { time: 84, text: "When you love someone, but it goes to waste" },
      { time: 96, text: "Could it be worse?" },
      { time: 110, text: "Lights will guide you home..." },
      { time: 124, text: "And ignite your bones..." },
      { time: 138, text: "And I will try to fix you." },
      { time: 160, text: "🎵 [Gitar Elektrik & Cymbal Build up]" },
      { time: 190, text: "Hold on, don't let it go..." },
      { time: 220, text: "🎵 [Klimaks Drumming Outro Bergemuruh]" }
    ]
  },
  "someone-like-you-adele": {
    lyrics: `I heard that you're settled down\nThat you found a girl and you're married now\nI heard that your dreams came true\nGuess she gave you things I didn't give to you\n\nOld friend, why are you so shy?\nAin't like you to hold back or hide from the light\n\nI hate to turn up out of the blue, uninvited\nBut I couldn't stay away, I couldn't fight it\nI had hoped you'd see my face\nAnd that you'd be reminded that for me, it isn't over\n\nNever mind, I'll find someone like you\nI wish nothing but the best for you, too\nDon't forget me, I beg\nI remember you said\n'Sometimes it lasts in love, but sometimes it hurts instead'`,
    translationAvailable: true,
    translation: `Kudengar kau telah menetap\nBahwa kau menemukan gadis dan kini menikah\nKudengar impian-impianmu jadi kenyataan\nKurasa dia memberimu hal yang tak kuberikan padamu\n\nTeman lama, mengapa kau begitu malu?\nBukan sifatmu menahan diri atau bersembunyi dari terang\n\nAku benci muncul tiba-tiba tanpa diundang\nTapi aku tak bisa menjauh, tak bisa melawannya\nKuharap kau melihat wajahku\nDan kau kan teringat bahwa bagiku, ini belum usai\n\nTak apa, aku akan menemukan seseorang sepertimu\nKuharap tak ada hal lain kecuali yang terbaik untukmu juga\nJangan lupakan aku, aku memohon\nAku ingat kau pernah berucap\n'Terkadang cinta abadi, tapi terkadang malah menyakitkan'`,
    meaning: "Balada soul legendaris dari Adele ini mengisahkan kenyataan pahit saat mengetahui mantan kekasih telah bahagia menikahi orang lain. Alih-alih hanyut dalam dendam, ia berusaha berdamai dengan kenyataan dengan mendoakan yang terbaik serta bertekad mencari sosok pengganti yang serupa.",
    syncedLyrics: [
      { time: 0, text: "🎵 [Sentuhan Piano Klasik Sendu]" },
      { time: 10, text: "I heard that you're settled down..." },
      { time: 18, text: "That you found a girl and married now" },
      { time: 26, text: "I heard that your dreams came true..." },
      { time: 34, text: "Guess she gave you things I didn't give to you" },
      { time: 42, text: "Old friend, why are you so shy?" },
      { time: 50, text: "Ain't like you to hold back or hide..." },
      { time: 58, text: "I hate to turn up out of the blue, uninvited" },
      { time: 66, text: "But I couldn't stay away, couldn't fight it" },
      { time: 74, text: "I had hoped you'd see my face and remember..." },
      { time: 82, text: "That for me, it isn't over..." },
      { time: 90, text: "Never mind, I'll find someone like you..." },
      { time: 100, text: "I wish nothing but the best for you, too!" },
      { time: 110, text: "Don't forget me, I beg, I remember you said..." },
      { time: 120, text: "Sometimes it lasts in love, but sometimes it hurts instead" },
      { time: 140, text: "🎵 [Melodi Piano Solo yang Mengalun Indah]" }
    ]
  },
  "retro-sunrise-vibe": {
    lyrics: `[Instrumental Lofi Beats]\n[Rain Drops sound backdrop]\nTake a breath, relax your mind\nWatch the sky rewrite its lines\nUnderneath the neon cloud\nSilence speaks so soft and loud...\n\nJust breathe...\nLet the sunset wash your soul`,
    translationAvailable: true,
    translation: `[Lagu Lofi Instrumental]\n[Suara rintik hujan melatari]\n Tarik napasmu, tenangkan pikiranmu\nSaksikan langit menulis kembali cahayanya\nDi bawah awan neon yang menggantung\nKeheningan berbicara begitu lembut dan nyaring...\n\nHembuskan saja...\nBiarkan senja membasuh jiwamu`,
    meaning: "Lagu instrumental lofi ini didesain khusus sebagai penenang aktivitas belajar atau relaksasi. Menggambarkan transisi tenang dari sore yang sibuk menuju malam yang hening, membantu mengistirahatkan pikiran yang lelah.",
    syncedLyrics: [
      { time: 0, text: "🎵 [Ketukan Vinyl & Lofi Drum Chill dimulai]" },
      { time: 12, text: "💧 [Hujan turun mengguyur lembut di kaca jendela]" },
      { time: 25, text: "Take a breath, relax your mind..." },
      { time: 38, text: "Watch the sky rewrite its lines" },
      { time: 52, text: "Underneath the neon cloud..." },
      { time: 65, text: "Silence speaks so soft and loud" },
      { time: 80, text: "🎵 [Rhythm Synth-Pad & Rhodes bercampur harmonis]" },
      { time: 110, text: "Just breathe..." },
      { time: 125, text: "Let the sunset wash your soul" },
      { time: 145, text: "🎵 [Lofi Vinyl Scratch Outro]" }
    ]
  },
  "midnight-city-run": {
    lyrics: `[Instrumental Fast Synthwave Arc]\n[Engines Roaring In the Distance]\nCyber highway, digital stars\nBurning rubber, escaping the barss\nInto the grid we disappear\nIn the speed there is no fear...\n\nNeon horizon calls we go...`,
    translationAvailable: true,
    translation: `[Melodi Cepat Instrumen Synthwave]\n[Raungan mesin terdengar di kejauhan]\nLebuhraya siber, bintang digital\nMelesat kencang, melepaskan belenggu kota\nDi dalam kisi jaringan kita menghilang\nDi atas laju kencang tak ada rasa takut...\n\nCakrawala neon memanggil kita melaju...`,
    meaning: "Track synthwave berenergi tinggi yang merepresentasikan nuansa retro-futurisme fiksi ilmiah tahun 80-an. Membawa pendengar menjelajahi jalan tol digital berkecepatan tinggi dengan gelombang audio yang memompa semangat.",
    syncedLyrics: [
      { time: 0, text: "🎵 [Ketukan Drum Kick Khas 80-an & Synth Bassline Arpeggio Cepat]" },
      { time: 15, text: "🏎️ [Suara desingan mesin mobil listrik futuristik berakselerasi]" },
      { time: 30, text: "Cyber highway, digital stars..." },
      { time: 42, text: "Burning rubber, escaping the bars!" },
      { time: 54, text: "Into the grid we disappear..." },
      { time: 66, text: "In the speed there is no fear!" },
      { time: 80, text: "🎵 [Solo Lead Synth Solo Melodi Retro-Wave Luar Biasa]" },
      { time: 120, text: "Neon horizon calls we go..." },
      { time: 140, text: "🎵 [Penurunan filter beat & Melodi Bassline memudar perlahan]" }
    ]
  },
  "fly-me-to-the-moon": {
    lyrics: `Fly me to the moon\nLet me play among the stars\nLet me see what spring is like on\nA-Jupiter and Mars\n\nIn other words, hold my hand\nIn other words, baby, kiss me\n\nFill my heart with song\nAnd let me sing for ever more\nYou are all I long for\nAll I worship and adore\n\nIn other words, please be true\nIn other words, I love you`,
    translationAvailable: true,
    translation: `Terbangkan aku ke bulan\nBiarkan aku bermain di antara bintang-bintang\nBiarkan kulihat seperti apa musim semi di\nYupiter dan Mars\n\nDengan kata lain, genggam tanganku\nDengan kata lain, kasih, cium aku\n\nPenuhi hatiku dengan lagu\nDan biarkan aku bernyanyi selamanya\nKaulah yang selalu kudambakan\nYang kupuja dan kuhormati\n\nDengan kata lain, mohon setialah\nDengan kata lain, aku mencintaimu`,
    meaning: "Lagu jazz legendaris Frank Sinatra ini mengekspresikan metafora kegembiraan luar biasa dari perasaan cinta semesta. Jatuh cinta digambarkan bagaikan melayang bebas merengkuh bulan, bermain di antara galaksi bintang, dan mencapai kebahagiaan surgawi di luar bumi.",
    syncedLyrics: [
      { time: 0, text: "🎵 [Tiupan Brass Jazz & Bass Berjalan]" },
      { time: 8, text: "Fly me to the moon, let me play among the stars..." },
      { time: 18, text: "Let me see what spring is like on Jupiter and Mars" },
      { time: 28, text: "In other words, hold my hand..." },
      { time: 38, text: "In other words, baby, kiss me!" },
      { time: 48, text: "Fill my heart with song and let me sing forever more" },
      { time: 58, text: "You are all I long for, all I worship and adore" },
      { time: 68, text: "In other words, please be true..." },
      { time: 78, text: "In other words, I... love... you!" },
      { time: 90, text: "🎵 [Solo Jazz Trombone & Saxophone Berayun Melodis]" },
      { time: 110, text: "In other words, please be true..." },
      { time: 120, text: "I... love... you!" },
      { time: 135, text: "🎵 [Ketukan Drum Rimshot Akhir Swing]" }
    ]
  }
};

// GET /api/youtube-suggest
app.get("/api/youtube-suggest", async (req: Request, res: Response): Promise<void> => {
  const query = req.query.q;
  if (!query || typeof query !== "string") {
    res.status(400).json({ error: "Query parameter 'q' is required." });
    return;
  }

  const cleanQuery = query.toLowerCase().trim();

  // 1. Check instant local known slugs / tracks
  const KNOWN_YT_MAP: Record<string, string> = {
    "hati-hati-di-jalan-tulus": "y2A_E97UAtM",
    "hati hati di jalan": "y2A_E97UAtM",
    "hati-hati di jalan": "y2A_E97UAtM",
    "fix you": "k4V3_GkySC4",
    "fix-you-coldplay": "k4V3_GkySC4",
    "retro-sunset-vibe": "5qap5aO4i9A",
    "retro sunset": "5qap5aO4i9A",
    "retro-sunrise-vibe": "5qap5aO4i9A",
    "retro sunrise": "5qap5aO4i9A",
    "someone-like-you-adele": "hLQl3WQQoQ0",
    "someone like you": "hLQl3WQQoQ0",
    "midnight-city-run": "dX3kKvKyHmw",
    "midnight city": "dX3kKvKyHmw",
    "fly-me-to-the-moon": "mQR0bXO_yI8",
    "fly me to the moon": "mQR0bXO_yI8"
  };

  for (const [key, val] of Object.entries(KNOWN_YT_MAP)) {
    if (cleanQuery.includes(key) || key.includes(cleanQuery)) {
      console.log(`[YouTube Map] Instant hit for query "${query}" -> ${val}`);
      res.json({ videoId: val, allIds: [val], source: "local_cache" });
      return;
    }
  }

  const matches: string[] = [];
  const regex = /(?:watch\?v=|watch%3Fv%3D|embed\/|youtu\.be\/|vi\/|"videoId"\s*:\s*")([a-zA-Z0-9_-]{11})/g;

  // 2. Primary Solver: DuckDuckGo HTML Search
  // DDG results for YouTube URLs bypasses YouTube's consent redirect wall on Datacenter environments and is incredibly lightning-fast!
  try {
    const ddgUrl = `https://html.duckduckgo.com/html/?q=site:youtube.com+${encodeURIComponent(query.trim())}`;
    const ddgRes = await fetch(ddgUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
        "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
        "Cache-Control": "max-age=0"
      }
    });

    if (ddgRes.ok) {
      const html = await ddgRes.text();
      let match;
      while ((match = regex.exec(html)) !== null) {
        const id = match[1];
        if (!matches.includes(id) && id !== "videoseries") {
          matches.push(id);
        }
        if (matches.length >= 8) break;
      }
      
      if (matches.length > 0) {
        console.log(`[YouTube Suggest] Clean resolved via DuckDuckGo: ${matches[0]}`);
        res.json({ videoId: matches[0], allIds: matches, source: "duckduckgo" });
        return;
      }
    }
  } catch (ddgErr) {
    console.warn("[YouTube Suggest] DuckDuckGo solver failed, trying backup:", ddgErr);
  }

  // 3. Fallback/Backup Solver: Direct YouTube results scraping with manual redirect handler
  try {
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query.trim())}`;
    const ytRes = await fetch(searchUrl, {
      redirect: 'manual', // Strictly avoid 'redirect count exceeded' Node undici errors!
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
        "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
        "Cache-Control": "no-cache"
      }
    });

    // If it redirected to cookie/consent screen of YouTube, we can't scrape, but we shouldn't fail/crash the endpoint.
    if (ytRes.status >= 300 && ytRes.status < 400) {
      console.log(`[YouTube Suggest] YouTube redirected (status ${ytRes.status}) to safety page. Handled manually.`);
    } else if (ytRes.ok) {
      const html = await ytRes.text();
      let match;
      while ((match = regex.exec(html)) !== null) {
        const id = match[1];
        if (!matches.includes(id) && id !== "videoseries") {
          matches.push(id);
        }
        if (matches.length >= 8) break;
      }
    }

    if (matches.length > 0) {
      console.log(`[YouTube Suggest] Clean resolved via Direct YouTube: ${matches[0]}`);
      res.json({ videoId: matches[0], allIds: matches, source: "youtube" });
    } else {
      // Return null beautifully without throwing any server errors to front-end
      res.json({ videoId: null, allIds: [], error: "No video found on either search index" });
    }
  } catch (error: any) {
    console.error("[YouTube Suggest Error]:", error);
    res.status(200).json({ videoId: null, allIds: [], error: "Pencarian YouTube sedang tidak tersedia", details: error.message });
  }
});

// ----------------------------------------------------
// GEMINI API CONTROLLERS
// ----------------------------------------------------

// POST /api/search
app.post("/api/search", async (req: Request, res: Response): Promise<void> => {
  const { query } = req.body;
  if (!query || typeof query !== "string") {
    res.status(400).json({ error: "Kolom query pencarian wajib diisi berupa teks." });
    return;
  }

  // First try searching Deezer API for real MP3 links!
  try {
    const searchUrl = `https://api.deezer.com/search?q=${encodeURIComponent(query.trim())}`;
    const deezerRes = await fetch(searchUrl, {
      headers: { "User-Agent": "AuraLirik Music Player/1.0" }
    });

    if (deezerRes.ok) {
      const deezerData = await deezerRes.json();
      if (deezerData && Array.isArray(deezerData.data) && deezerData.data.length > 0) {
        // Map Deezer items to our rich Song structure
        const mappedSongs = deezerData.data.slice(0, 15).map((track: any) => {
          // Detect genre
          let genre = "Pop";
          const artistName = (track.artist?.name || "").toLowerCase();
          const trackTitle = (track.title || "").toLowerCase();
          const combinedText = `${artistName} ${trackTitle} ${query.toLowerCase()}`;

          if (combinedText.includes("rock") || combinedText.includes("metal") || combinedText.includes("grunge") || combinedText.includes("coldplay") || combinedText.includes("linkin")) {
            genre = "Rock / Indierock";
          } else if (combinedText.includes("jazz") || combinedText.includes("blues") || combinedText.includes("sinatra")) {
            genre = "Jazz / Swing";
          } else if (combinedText.includes("lofi") || combinedText.includes("chill") || combinedText.includes("study") || combinedText.includes("hujan")) {
            genre = "Lofi / Chillout";
          } else if (combinedText.includes("synth") || combinedText.includes("electronic") || combinedText.includes("neon") || combinedText.includes("80s")) {
            genre = "Synthwave / Retro";
          } else if (combinedText.includes("akustik") || combinedText.includes("acoustic") || combinedText.includes("folk") || combinedText.includes("guitar")) {
            genre = "Acoustic / Folk";
          }

          // Choose synth instrument styles
          let instrument: 'ambient' | 'lofi' | 'synthwave' | 'rock' | 'piano' = 'piano';
          if (genre.includes("Rock")) instrument = "rock";
          else if (genre.includes("Lofi")) instrument = "lofi";
          else if (genre.includes("Synth")) instrument = "synthwave";
          else if (genre.includes("Jazz")) instrument = "ambient";

          const chordSets = [
            ["C", "G", "Am", "F"],
            ["F", "G", "Em", "Am"],
            ["Am", "F", "C", "G"],
            ["C", "Em", "Am", "G"],
            ["F", "C", "G", "Am"]
          ];
          const progression = chordSets[Math.floor(Math.random() * chordSets.length)];

          const artistNameStr = track.artist?.name || "Artis Tidak Dikenal";
          const titleStr = track.title || "";

          return {
            id: `dz-${track.id}`,
            title: titleStr,
            artist: artistNameStr,
            album: track.album?.title || "Single / Album",
            year: new Date().getFullYear(),
            genre: genre,
            duration: track.duration || 180,
            mood: "Pencarian MP3 Aktual",
            description: `Tembang berkualitas tinggi dari artis ${artistNameStr}. Mainkan audio asli via mode MP3.`,
            audioUrl: track.preview, // The 30s official MP3 preview link!
            albumArtUrl: track.album?.cover_medium || "", // The official album cover art!
            soundcloudUrl: `https://soundcloud.com/search?q=${encodeURIComponent(artistNameStr + " " + titleStr)}`,
            audiomackUrl: `https://audiomack.com/search?q=${encodeURIComponent(artistNameStr + " " + titleStr)}`,
            synthParams: {
              tempo: Math.floor(Math.random() * 30) + 75, // 75-105 BPM
              key: "C Major",
              progression: progression,
              instrument: instrument
            }
          };
        });

        res.json(mappedSongs);
        return;
      }
    }
  } catch (deezerError) {
    console.error("Deezer search error, resolving back to Gemini:", deezerError);
  }

  const ai = getGeminiClient();
  if (!ai) {
    // Return high quality filtered fallback songs
    const normalizedQuery = query.toLowerCase().trim();
    if (normalizedQuery === "") {
      res.json(FALLBACK_SONGS);
      return;
    }
    const filtered = FALLBACK_SONGS.filter(s => 
      s.title.toLowerCase().includes(normalizedQuery) ||
      s.artist.toLowerCase().includes(normalizedQuery) ||
      s.genre.toLowerCase().includes(normalizedQuery) ||
      s.mood.toLowerCase().includes(normalizedQuery) ||
      s.description.toLowerCase().includes(normalizedQuery)
    );
    // If no filtered matches, return everything to keep UI beautiful and highly interactive
    res.json(filtered.length > 0 ? filtered : FALLBACK_SONGS);
    return;
  }

  try {
    const systemPrompt = `You are a music catalog generator assistant designed to find songs and supply accurate musical attributes. Given a search query (which can be a song title, artist name, sound style, mood, or lyrics snippet), return an array of matching songs. 
You can return real popular songs that match, or if the query describes a custom mood (e.g. 'coding at midnight in the rain' or 'relaxing under cherry blossoms'), creatively generate matching song pieces.
For each song, you MUST provide precise chord progressions (exactly 4 chords, e.g. ["Am", "F", "C", "G"]), a clear tempo (BPM from 50 to 140), and a select synthesizer instrument (ambient, lofi, synthwave, rock, piano) to enable high quality dynamic Web Audio synthesis. Return the matching results in Indonesian language descriptions when possible.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `Pencarian Lagu & Detail Musik: "${query}"`,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING, description: "A clean unique lowercase URL-safe slug for the song, e.g. 'fix-you-coldplay' or 'midnight-lofi'" },
              title: { type: Type.STRING, description: "The song title" },
              artist: { type: Type.STRING, description: "The artist or creator name" },
              album: { type: Type.STRING, description: "The album name or 'Single'" },
              year: { type: Type.INTEGER, description: "The release year" },
              genre: { type: Type.STRING, description: "The music genre (e.g., Pop, Alternative, Rock, Lofi, Synthwave, Jazz, Acoustic, Classical)" },
              duration: { type: Type.INTEGER, description: "Estimated duration of the song in seconds, must be between 120 and 320 seconds" },
              mood: { type: Type.STRING, description: "The general mood (e.g., Chill, Melancolis, Ceria, Romantis, Tenang, Megah)" },
              description: { type: Type.STRING, description: "A brief Indonesian description or history of this track" },
              synthParams: {
                type: Type.OBJECT,
                description: "Sound parameter configuration for Web Audio synthesizer",
                properties: {
                  tempo: { type: Type.INTEGER, description: "BPM of the song, from 50 to 140" },
                  key: { type: Type.STRING, description: "The musical scale key (e.g., 'C Major', 'A Minor')" },
                  progression: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: "Exactly 4 simple chord name strings representing a progression loop, e.g. ['C', 'G', 'Am', 'F'], or ['F', 'G', 'Em', 'Am']. Allow simple chords: C, G, Am, F, Em, Dm, D, A, Bm, E, Bb."
                  },
                  instrument: {
                    type: Type.STRING,
                    description: "Synthesizer style preset, must be ONE of: 'ambient', 'lofi', 'synthwave', 'rock', 'piano'"
                  }
                },
                required: ["tempo", "key", "progression", "instrument"]
              }
            },
            required: ["id", "title", "artist", "album", "year", "genre", "duration", "mood", "description", "synthParams"]
          }
        }
      }
    });

    const resultText = response.text || "[]";
    const parsedSongsData = JSON.parse(resultText);
    
    // Inject custom albumArtSeed to standardise Unsplash picture loads
    const enhancedSongs = parsedSongsData.map((song: any) => {
      const artSeed = song.id || `${song.title.toLowerCase().replace(/\s+/g, '-')}-${song.artist.toLowerCase().replace(/\s+/g, '-')}`;
      return {
        ...song,
        albumArtSeed: artSeed,
        soundcloudUrl: `https://soundcloud.com/search?q=${encodeURIComponent(song.artist + " " + song.title)}`,
        audiomackUrl: `https://audiomack.com/search?q=${encodeURIComponent(song.artist + " " + song.title)}`
      };
    });

    res.json(enhancedSongs);
  } catch (error: any) {
    handleGeminiError(error, "Search");
    // Graceful error recovery: send filtered fallback songs so user has a perfect offline search journey
    const filtered = FALLBACK_SONGS.filter(s => 
      s.title.toLowerCase().includes(query.toLowerCase()) || 
      s.artist.toLowerCase().includes(query.toLowerCase())
    );
    res.json(filtered.length > 0 ? filtered : FALLBACK_SONGS);
  }
});

// POST /api/lyrics
app.post("/api/lyrics", async (req: Request, res: Response): Promise<void> => {
  const { id, title, artist, duration } = req.body;
  if (!title || !artist) {
    res.status(400).json({ error: "Parameter title dan artist lagu wajib disertakan." });
    return;
  }

  const ai = getGeminiClient();
  // Safe Offline Mode Helper:
  if (!ai) {
    const knownLyrics = FALLBACK_LYRICS[id];
    if (knownLyrics) {
      res.json({ ...knownLyrics, isOfflineFallback: true });
    } else {
      // Craft a gorgeous dynamic offline lyric response for non-fallback songs
      res.json({ ...generateDynamicOfflineLyrics(title, artist, duration || 200), isOfflineFallback: true });
    }
    return;
  }

  try {
    const activeDuration = duration || 180;
    const systemPrompt = `You are a music lyrics generator and lyric syncing assistant. Given a song title and its artist, return:
1. The complete authentic formatted song lyrics in its original language, with standard stanza breaks.
2. A bool if translation is available (true if original song is not Indonesian).
3. The complete beautiful Indonesian translation of the lyrics, or null/empty if the original is already in Indonesian.
4. A highly engaging 2-3 sentence description of the track's meaning, poetic story, or history in Indonesian with a friendly and passionate music expert tone.
5. An array of synchronized timestamped lyric lines spanning the song duration (0 to ${activeDuration} seconds). Space the lines logically (e.g. every 5 to 15 seconds) so that as the duration progresses from 0 to ${activeDuration}, lyrics scroll in perfect unison. Make sure the first item is an Intro indicator and last is an Outro.

Generate this output in JSON format complying strictly with the requested scheme.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `Dapatkan lirik & sinkronisasi waktu untuk lagu: "${title}" oleh "${artist}" dengan durasi sekitar ${activeDuration} detik.`,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            lyrics: { type: Type.STRING, description: "Complete song lyrics in original language" },
            translationAvailable: { type: Type.BOOLEAN, description: "Whether translated lyrics are provided" },
            translation: { type: Type.STRING, description: "The full Indonesian translation or null" },
            meaning: { type: Type.STRING, description: "Meaning/story behind lyrics written in warm musicology Indonesian" },
            syncedLyrics: {
              type: Type.ARRAY,
              description: "Array of synced lyrics containing time (second integer) and lyrics text",
              items: {
                type: Type.OBJECT,
                properties: {
                  time: { type: Type.INTEGER, description: "Timestamp in seconds from 0 to song duration" },
                  text: { type: Type.STRING, description: "Lyrics line text" }
                },
                required: ["time", "text"]
              }
            }
          },
          required: ["lyrics", "translationAvailable", "meaning", "syncedLyrics"]
        }
      }
    });

    const resultText = response.text || "{}";
    res.json(JSON.parse(resultText));
  } catch (error: any) {
    handleGeminiError(error, "Lyrics");
    // Safe fallback so interface doesn't stall
    const knownLyrics = FALLBACK_LYRICS[id];
    if (knownLyrics) {
      res.json({ ...knownLyrics, isOfflineFallback: true });
    } else {
      res.json({ ...generateDynamicOfflineLyrics(title, artist, duration || 200), isOfflineFallback: true });
    }
  }
});

// Helper for offline dynamic lyrics search to maintain a stellar interface
function generateDynamicOfflineLyrics(title: string, artist: string, duration: number): LyricsData {
  return {
    lyrics: `[Verse 1]\nKu bersenandung di bawah bayang awan biru\nMencari melodi yang dahulu pernah kau nyanyikan untukku\nKini semuanya beralih menjadi sebuah fiksi pudar\nYang kuharap kan bersinar lagi...\n\n[Chorus]\nMelodi indah tentang kita\nTerbingkai rapi dalam album memori lama\nKan selalu kuingat, kuputar dalam sunyi\nWalau kini ku melangkah sendiri...\n\n[Verse 2]\nWaktu terus melaju tanpa sedikit pun ragu\nMembawa langkah kaki menjauh dari masa laluku\nNamun lirik ini kan abadi selamanya\nSebuah lagu penenang jiwa yang lara.`,
    translationAvailable: true,
    translation: `[Bait 1]\nI hum beneath the shadow of blue clouds\nSearching for the melody you once sang for me\nNow everything has turned into a fading fiction\nThat I hope will shine bright again...\n\n[Reff]\nA beautiful melody about us\nFramed neatly in the album of old memories\nI will always remember, playing it in silence\nEven though I now walk alone...\n\n[Bait 2]\nTime keeps rushing forward without a single doubt\nCarrying my footsteps far away from my history\nBut these lyrics will remain eternal\nA soothing song for the wounded soul.`,
    meaning: `Lagu "${title}" oleh ${artist} mengekspresikan sentimentasi melankolis yang berbalut harapan mengenai hubungan masa lalu. Melodi ini menyiratkan betapa memori lama dapat berfungsi ganda: sebagai pengingat perih masa lalu sekaligus sebagai lagu penenang jiwa di kala sepi melanda.`,
    syncedLyrics: [
      { time: 0, text: "🎵 [Melodi Akustik Pembuka Dimulai]" },
      { time: 10, text: "Ku bersenandung di bawah bayang awan biru..." },
      { time: 24, text: "Mencari melodi yang dahulu kau nyanyikan untukku" },
      { time: 38, text: "Kini semuanya beralih menjadi sebuah fiksi pudar" },
      { time: 50, text: "Yang kuharap kan bersinar lagi..." },
      { time: 65, text: "🎵 [Drum & Synth Pad Masuk Lembut]" },
      { time: 75, text: "Melodi indah tentang kisah perjalanan kita" },
      { time: 88, text: "Terbingkai rapi dalam album memori lama..." },
      { time: 100, text: "Kan selalu kuingat, kuputar di dalam sunyi" },
      { time: 112, text: "Walau kini ku melangkah sendiri..." },
      { time: 130, text: "Waktu terus melaju tanpa sedikit pun ragu..." },
      { time: 142, text: "Membawa langkah kaki menjauh dari masa laluku" },
      { time: 154, text: "Namun lirik ini kan abadi selamanya..." },
      { time: 168, text: "Sebuah lagu murni penenang jiwa lara" },
      { time: 185, text: "🎵 [Melodi Outro Mengalun Lembut hingga Akhir]" }
    ]
  };
}

// POST /api/suggestions
app.post("/api/suggestions", async (req: Request, res: Response): Promise<void> => {
  const { songs } = req.body;
  if (!songs || !Array.isArray(songs)) {
    res.status(400).json({ error: "Diperlukan array daftar lagu saat ini untuk referensi." });
    return;
  }

  const ai = getGeminiClient();
  if (!ai) {
    // Generate lovely relative context suggestions
    const matched = FALLBACK_SONGS.filter(fs => !songs.some(s => s.id === fs.id));
    res.json(matched.length > 0 ? matched.slice(0, 3) : FALLBACK_SONGS.slice(0, 3));
    return;
  }

  try {
    const referenceList = songs.map(s => `${s.title} - ${s.artist} (Genre: ${s.genre}, Mood: ${s.mood})`).join(", ");
    const systemPrompt = `You are a professional music curator. Given current list of user tracks: [${referenceList}], generate 3 highly matching, complimentary songs (can be real popular tracks, or custom themed fits if existing list is niche/themed).
Ensure each suggested track features rich chord progression (4 simple chords), precise tempo (BPM 50-140), and synth instrument presets (ambient, lofi, synthwave, rock, piano) to let user play them procedurally. Write Indonesian description texts.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: "Rekomendasikan 3 lagu pendamping berdasarkan playlist saya saat ini.",
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING, description: "A simple unique lowercase identifier" },
              title: { type: Type.STRING },
              artist: { type: Type.STRING },
              album: { type: Type.STRING },
              year: { type: Type.INTEGER },
              genre: { type: Type.STRING },
              duration: { type: Type.INTEGER },
              mood: { type: Type.STRING },
              description: { type: Type.STRING, description: "Why this song fits perfectly with their playlist in Indonesian" },
              synthParams: {
                type: Type.OBJECT,
                properties: {
                  tempo: { type: Type.INTEGER },
                  key: { type: Type.STRING },
                  progression: { type: Type.ARRAY, items: { type: Type.STRING } },
                  instrument: { type: Type.STRING }
                },
                required: ["tempo", "key", "progression", "instrument"]
              }
            },
            required: ["id", "title", "artist", "album", "year", "genre", "duration", "mood", "description", "synthParams"]
          }
        }
      }
    });

    const resultText = response.text || "[]";
    const recommended = JSON.parse(resultText).map((s: any) => ({
      ...s,
      albumArtSeed: s.id || `${s.title.toLowerCase().replace(/\s+/g, '-')}-${s.artist.toLowerCase().replace(/\s+/g, '-')}`
    }));
    res.json(recommended);
  } catch (error: any) {
    handleGeminiError(error, "Suggestions");
    // Graceful offline fallback
    const matched = FALLBACK_SONGS.filter(fs => !songs.some(s => s.id === fs.id));
    res.json(matched.length > 0 ? matched.slice(0, 3) : FALLBACK_SONGS.slice(0, 3));
  }
});

// POST /api/chat
app.post("/api/chat", async (req: Request, res: Response): Promise<void> => {
  const { message, history } = req.body;
  if (!message || typeof message !== "string") {
    res.status(400).json({ error: "Kolom pesan wajib diisi berupa teks." });
    return;
  }

  const ai = getGeminiClient();
  if (!ai) {
    // Graceful fallback for offline mode
    res.json({ text: getFallbackChatResponse(message) });
    return;
  }

  try {
    const systemPrompt = `You are a warm, extremely knowledgeable Virtual DJ or Musicology Assistant named 'Rara'. You speak Indonesian fluently. Help users find music, explore semantic details or background history of lyrics, translate music verses, or curate custom playlists.
If users ask for song recommendations, you can suggest fitting music tracks based on their mood, genre or descriptive context.
To make these suggested tracks interactive (allowing the user to play them or add them instantly to checklists/playlists on the frontend UI), you MUST attach custom structured song JSONs right at the very end of your response inside a block of code with the precise tag "json-attachment":
\`\`\`json-attachment
[
  {
    "id": "gemini-reko-id",
    "title": "Song Title",
    "artist": "Artist or Band Name",
    "album": "Album Name or Single",
    "year": 2025,
    "genre": "Genre Style",
    "duration": 180,
    "mood": "Relaxing",
    "description": "Short poetic Indonesian explanation of why this fits perfectly",
    "synthParams": {
      "tempo": 84,
      "key": "C Major",
      "progression": ["C", "F", "Am", "G"],
      "instrument": "lofi"
    }
  }
]
\`\`\`
Keep your conversations engaging, warm, beautifully styled, and passionate. If no direct suggestions are requested or needed, do NOT include the json-attachment block. Work safely with standard chords. Limit attachment to maximum 2 tracks.`;

    // Construct simple history contents payload if available
    const contents = [];
    if (history && Array.isArray(history)) {
      for (const h of history) {
        contents.push({
          role: h.role, 
          parts: [{ text: h.text }]
        });
      }
    }
    // Append the user message
    contents.push({
      role: "user",
      parts: [{ text: message }]
    });

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: contents,
      config: {
        systemInstruction: systemPrompt,
      }
    });

    res.json({ text: response.text || "Senang sekali bisa membicarakan irama bersamamu!" });
  } catch (error: any) {
    handleGeminiError(error, "Chat");
    res.json({ text: getFallbackChatResponse(message) });
  }
});

function getFallbackChatResponse(msg: string): string {
  const m = msg.toLowerCase();
  
  if (m.includes("rekomendasi") || m.includes("buat daftar") || m.includes("buatkan daftar") || m.includes("cari") || m.includes("lofi") || m.includes("synthwave") || m.includes("lagu")) {
    return `Berdasarkan pencarian musikmu tentang "${msg}", saya merekomendasikan lagu lofi buatan studio lofi saya yang syahdu ini untuk menemani harimu. Silakan putar langsung atau masukkan ke playlist pribadimu secara mudah di bawah ini!

\`\`\`json-attachment
[
  {
    "id": "senja-syahdu-lofi",
    "title": "Harmoni Senja",
    "artist": "Rara's Studio",
    "album": "AI Curator Special",
    "year": 2026,
    "genre": "Lofi Chill / Ambient",
    "duration": 192,
    "mood": "Tenang",
    "description": "Sebuah rilis lofi akustik rancangan asisten AI peneman aktivitas sore hari Anda.",
    "synthParams": {
      "tempo": 84,
      "key": "C Major",
      "progression": ["C", "Am", "Dm", "G"],
      "instrument": "lofi"
    }
  }
]
\`\`\``;
  }
  
  if (m.includes("fix you") || m.includes("arti") || m.includes("makna") || m.includes("hati-hati") || m.includes("hati hati") || m.includes("tulus") || m.includes("adele")) {
    return `Lagu-lagu tersebut memiliki makna puitis yang sangat membekas di relung hati. 

Melodi seperti **Fix You** dari **Coldplay** atau **Hati-Hati di Jalan** milik **Tulus** mengajarkan kita tentang bagaimana merayakan duka secara dewasa, memberikan kepedulian yang tulus, dan belajar melepaskan cinta yang tak lagi sejalan dengan ikhlas tanpa dendam.

Apakah ada kalimat lirik tertentu yang ingin Anda bedah bait per bait bersama saya?`;
  }

  return "Saya sangat menikmati obrolan musik kita saat ini! Katakan, apakah ada genre menarik, band legendaris, atau mood senja tertentu yang ingin kita eksplorasi liriknya malam ini?";
}


// ----------------------------------------------------
// NODE PORTAL & VITE SERVING MANAGEMENT
// ----------------------------------------------------
async function runServer() {
  if (process.env.NODE_ENV !== "production") {
    // Development Mode: Mount Vite Middleware
    console.log("Starting server in DEVELOPMENT mode with Vite Middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    
    app.use(vite.middlewares);
  } else {
    // Production Mode: Serve Compiled Files
    console.log("Starting server in PRODUCTION mode...");
    const distPath = path.join(process.cwd(), "dist");
    
    app.use(express.static(distPath));
    app.get("*", (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Pencari Lagu dan Lirik server is online on http://localhost:${PORT}`);
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "MY_GEMINI_API_KEY") {
      console.warn("⚠️ PERINGATAN: GEMINI_API_KEY belum dikonfigurasi di secrets. Aplikasi berjalan dalam mode Offline database cerdas.");
    }
  });
}

runServer().catch((err) => {
  console.error("Critical Server Boot Failure:", err);
});
