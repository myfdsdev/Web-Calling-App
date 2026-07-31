/**
 * Supported Vapi voices.
 *
 * These map to real, currently-supported Vapi voice providers/ids. The client
 * loads this list from the backend (GET /api/agent-builder/voices) so no voice
 * ids are hardcoded in the browser and every selectable voice is guaranteed to
 * be valid for assistant creation.
 *
 * `provider` + `voiceId` are exactly what Vapi expects under `assistant.voice`.
 */
// NOTE: only Vapi's CURRENT native voices — the earlier set (Harry, Paige, Neha,
// Spencer, …) was retired by Vapi and can no longer create assistants. Keep this
// in sync with https://docs.vapi.ai/providers/voice/vapi-voices.
export const SUPPORTED_VOICES = [
  {
    id: 'elliot',
    provider: 'vapi',
    voiceId: 'Elliot',
    name: 'Elliot',
    gender: 'Male',
    type: 'Warm Male',
    description: 'Friendly, clear and conversational.',
    languages: ['English'],
    accent: 'American',
  },
  {
    id: 'savannah',
    provider: 'vapi',
    voiceId: 'Savannah',
    name: 'Savannah',
    gender: 'Female',
    type: 'Professional Female',
    description: 'Polished, articulate and business-ready.',
    languages: ['English'],
    accent: 'American',
  },
  {
    id: 'layla',
    provider: 'vapi',
    voiceId: 'Layla',
    name: 'Layla',
    gender: 'Female',
    type: 'Warm Female',
    description: 'Gentle, natural and approachable.',
    languages: ['English'],
    accent: 'American',
  },
  {
    id: 'rohan',
    provider: 'vapi',
    voiceId: 'Rohan',
    name: 'Rohan',
    gender: 'Male',
    type: 'Energetic Male',
    description: 'Upbeat, warm and engaging.',
    languages: ['English', 'Hindi'],
    accent: 'Indian',
  },
  {
    id: 'naina',
    provider: 'vapi',
    voiceId: 'Naina',
    name: 'Naina',
    gender: 'Female',
    type: 'Warm Female',
    description: 'Gentle, natural and approachable.',
    languages: ['English', 'Hindi'],
    accent: 'Indian',
  },
];

const VOICE_MAP = new Map(SUPPORTED_VOICES.map((v) => [v.id, v]));

export function getVoiceById(id) {
  return VOICE_MAP.get(id) || null;
}

/** Validate that a provider/voiceId pair is one we officially support. */
export function isSupportedVoice(provider, voiceId) {
  return SUPPORTED_VOICES.some((v) => v.provider === provider && v.voiceId === voiceId);
}

/** The default model provider/name used for every generated assistant. */
export const MODEL_CONFIG = {
  provider: 'openai',
  model: 'gpt-4o-mini',
};

/** The default transcriber (speech-to-text) used for every assistant. */
export const TRANSCRIBER_CONFIG = {
  provider: 'deepgram',
  model: 'nova-2',
};
