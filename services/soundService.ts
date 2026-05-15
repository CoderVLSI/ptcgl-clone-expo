/**
 * Sound Service — generates sounds via ElevenLabs Sound Effects API on first use,
 * caches them in sessionStorage (web) so subsequent plays are instant.
 */

const ELEVENLABS_API_KEY = 'sk_06e4572107305bbe28446d9155635ae153cb6b81ef569629';
const ELEVENLABS_URL = 'https://api.elevenlabs.io/v1/sound-generation';
const CACHE_PREFIX = 'ptcgl_sound_';

export type SoundName =
    | 'card_draw'
    | 'card_play'
    | 'attack_hit'
    | 'attack_water'
    | 'attack_fire'
    | 'attack_lightning'
    | 'attack_psychic'
    | 'attack_fighting'
    | 'attack_darkness'
    | 'energy_attach'
    | 'evolve'
    | 'evolve_mega'
    | 'knockout'
    | 'prize_card'
    | 'button_click'
    | 'game_start'
    | 'win'
    | 'lose';

const SOUND_PROMPTS: Record<SoundName, { text: string; duration: number }> = {
    card_draw:        { text: 'crisp playing card sliding flick draw sound',                 duration: 0.8 },
    card_play:        { text: 'card slap placement on table game sound',                     duration: 0.6 },
    attack_hit:       { text: 'powerful punch impact hit thud game sound effect',            duration: 0.8 },
    attack_water:     { text: 'water splash burst attack sound effect',                      duration: 1.0 },
    attack_fire:      { text: 'fire explosion burst blast sound effect',                     duration: 1.0 },
    attack_lightning: { text: 'electric lightning zap crackle attack sound effect',         duration: 0.8 },
    attack_psychic:   { text: 'mystical psychic energy whoosh shimmer sound',               duration: 1.0 },
    attack_fighting:  { text: 'powerful martial arts punch kick impact hit',                 duration: 0.7 },
    attack_darkness:  { text: 'dark shadow energy swoosh attack sound',                     duration: 1.0 },
    energy_attach:    { text: 'magical energy sparkle attachment ding chime',               duration: 0.6 },
    evolve:           { text: 'dramatic pokemon evolution transformation magical sound',      duration: 2.0 },
    evolve_mega:      { text: 'epic mega evolution dramatic power surge sound',              duration: 2.5 },
    knockout:         { text: 'dramatic explosion knockout pow hit sound effect',            duration: 1.2 },
    prize_card:       { text: 'reward victory coin collect chime sound',                    duration: 0.8 },
    button_click:     { text: 'soft UI button click tap sound',                              duration: 0.3 },
    game_start:       { text: 'epic game battle start fanfare drumroll sound',               duration: 2.0 },
    win:              { text: 'victory fanfare triumph celebratory triumphant sound',        duration: 2.5 },
    lose:             { text: 'defeat sad trombone game over sound',                         duration: 2.0 },
};

// In-memory blob URL cache (fast repeat plays within a session)
const memoryCache = new Map<SoundName, string>();
// Track in-flight generation promises to avoid duplicate calls
const pending = new Map<SoundName, Promise<string | null>>();

let muted = false;

export function setMuted(value: boolean) { muted = value; }
export function isMuted() { return muted; }

function sessionKey(name: SoundName) { return CACHE_PREFIX + name; }

function loadFromSession(name: SoundName): string | null {
    try {
        return sessionStorage.getItem(sessionKey(name));
    } catch { return null; }
}

function saveToSession(name: SoundName, base64: string) {
    try { sessionStorage.setItem(sessionKey(name), base64); } catch { /* quota exceeded — no-op */ }
}

async function generateSound(name: SoundName): Promise<string | null> {
    const { text, duration } = SOUND_PROMPTS[name];
    try {
        const res = await fetch(ELEVENLABS_URL, {
            method: 'POST',
            headers: {
                'xi-api-key': ELEVENLABS_API_KEY,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ text, duration_seconds: duration, prompt_influence: 0.4 }),
        });
        if (!res.ok) return null;
        const arrayBuffer = await res.arrayBuffer();
        // Convert to base64 for sessionStorage
        const bytes = new Uint8Array(arrayBuffer);
        let binary = '';
        bytes.forEach(b => { binary += String.fromCharCode(b); });
        const base64 = 'data:audio/mpeg;base64,' + btoa(binary);
        saveToSession(name, base64);
        return base64;
    } catch {
        return null;
    }
}

async function ensureLoaded(name: SoundName): Promise<string | null> {
    if (memoryCache.has(name)) return memoryCache.get(name)!;

    const session = loadFromSession(name);
    if (session) {
        memoryCache.set(name, session);
        return session;
    }

    // Deduplicate simultaneous requests for the same sound
    if (pending.has(name)) return pending.get(name)!;

    const promise = generateSound(name).then(url => {
        if (url) memoryCache.set(name, url);
        pending.delete(name);
        return url;
    });
    pending.set(name, promise);
    return promise;
}

export async function playSound(name: SoundName, volume = 1.0) {
    if (muted) return;
    try {
        const src = await ensureLoaded(name);
        if (!src) return;
        const audio = new (window as any).Audio(src) as HTMLAudioElement;
        audio.volume = Math.max(0, Math.min(1, volume));
        audio.play().catch(() => {});
    } catch { /* silently ignore on platforms without Audio */ }
}

/** Fire-and-forget: start loading a sound without blocking. */
export function preloadSound(name: SoundName) {
    ensureLoaded(name).catch(() => {});
}

/** Preload high-priority sounds right away so first plays are instant. */
export function preloadEssentialSounds() {
    const essential: SoundName[] = ['card_draw', 'card_play', 'button_click', 'energy_attach', 'attack_hit'];
    essential.forEach(preloadSound);
}

/** Return the right attack sound for a Pokémon energy type. */
export function attackSoundForType(energyType?: string): SoundName {
    const map: Record<string, SoundName> = {
        water:     'attack_water',
        fire:      'attack_fire',
        lightning: 'attack_lightning',
        psychic:   'attack_psychic',
        fighting:  'attack_fighting',
        darkness:  'attack_darkness',
        grass:     'attack_hit',
        metal:     'attack_hit',
        colorless: 'attack_hit',
    };
    return (energyType && map[energyType]) ? map[energyType] : 'attack_hit';
}
