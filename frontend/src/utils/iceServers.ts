// frontend/src/utils/iceServers.ts
// Fetches fresh TURN credentials from Metered.ca API at runtime.
// Falls back to free Google STUN servers if the API call fails.

let cachedConfig: RTCConfiguration | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 1000 * 60 * 30; // 30 minutes — credentials usually expire in 12h

export const getIceServers = async (): Promise<RTCConfiguration> => {
  const now = Date.now();

  // Return cached config if still fresh
  if (cachedConfig && now - cacheTimestamp < CACHE_TTL) {
    return cachedConfig;
  }

  const apiKey = import.meta.env.VITE_METERED_API_KEY;

  if (!apiKey) {
    console.warn('⚠️ No VITE_METERED_API_KEY set — using free STUN only (video may fail behind NAT)');
    return {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    };
  }

  try {
    const res = await fetch(`https://syncspaceapplication.metered.live/api/v1/turn/credentials?apiKey=${apiKey}`);
    if (!res.ok) throw new Error(`Metered API returned ${res.status}`);
    const iceServers = await res.json();
    cachedConfig = { iceServers, iceCandidatePoolSize: 10 };
    cacheTimestamp = now;
    console.log('✅ Fresh TURN credentials fetched from Metered');
    return cachedConfig;
  } catch (err) {
    console.error('❌ Failed to fetch TURN credentials:', err);
    // Fallback to free STUN
    return {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    };
  }
};
