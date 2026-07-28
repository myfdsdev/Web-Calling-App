import { env } from '../config/env.js';
import { MODEL_CONFIG, TRANSCRIBER_CONFIG, isSupportedVoice } from '../config/voices.js';
import { AppError } from '../utils/apiResponse.js';

/** Remove keys whose value is undefined/null/'' so we never send empty fields. */
function pruneUndefined(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === '') continue;
    out[k] = v;
  }
  return out;
}

/**
 * Build the exact Vapi assistant payload from a draft/agent-like object.
 * Requires: name, firstMessage, generatedSystemPrompt/systemPrompt, voice.
 */
export function buildAssistantPayload(source) {
  const systemPrompt = source.generatedSystemPrompt || source.systemPrompt || '';
  const voiceProvider = source.selectedVoiceProvider || source.voiceProvider;
  const voiceId = source.selectedVoiceId || source.voiceId;

  if (!source.agentName && !source.name) throw new AppError('Agent name is required.', 422, 'MISSING_NAME');
  if (!voiceProvider || !voiceId) throw new AppError('A voice must be selected.', 422, 'MISSING_VOICE');
  if (!isSupportedVoice(voiceProvider, voiceId)) {
    throw new AppError('The selected voice is not supported.', 422, 'UNSUPPORTED_VOICE');
  }
  if (!systemPrompt) throw new AppError('The system prompt has not been generated.', 422, 'MISSING_PROMPT');

  const payload = {
    name: source.agentName || source.name,
    firstMessage: source.firstMessage || undefined,
    model: {
      provider: MODEL_CONFIG.provider,
      model: MODEL_CONFIG.model,
      messages: [{ role: 'system', content: systemPrompt }],
    },
    voice: pruneUndefined({ provider: voiceProvider, voiceId }),
    transcriber: {
      provider: TRANSCRIBER_CONFIG.provider,
      model: TRANSCRIBER_CONFIG.model,
    },
    server: pruneUndefined({
      url: env.vapi.webhookUrl,
      secret: env.vapi.webhookSecret || undefined,
    }),
  };

  return pruneUndefined(payload);
}

/** Turn a Vapi/network error into a client-safe message (never leak the key). */
function sanitizeVapiError(status, body) {
  let message = 'The voice platform rejected the request.';
  if (body && typeof body === 'object') {
    if (Array.isArray(body.message)) message = body.message.join(' ');
    else if (typeof body.message === 'string') message = body.message;
    else if (typeof body.error === 'string') message = body.error;
  } else if (typeof body === 'string' && body.trim()) {
    message = body.slice(0, 300);
  }
  // Strip anything that looks like a token/bearer value.
  message = message.replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer ***').slice(0, 400);
  return { status: status || 502, message };
}

/**
 * `vapiConfig` = { privateKey, baseUrl } for the workspace whose account this
 * request runs on (see apiKeyService.resolveVapiConfig). Falls back to the
 * system env key ONLY when no config is passed, so internal/legacy callers and
 * tests keep working.
 */
async function vapiRequest(method, path, body, vapiConfig) {
  const privateKey = vapiConfig?.privateKey ?? env.vapi.privateKey;
  const baseUrl = vapiConfig?.baseUrl || env.vapi.baseUrl;

  if (!privateKey) {
    throw new AppError(
      'No Vapi API key is configured for this workspace. Add your Vapi private key in API settings.',
      503,
      'VAPI_NOT_CONFIGURED'
    );
  }

  let res;
  try {
    res = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${privateKey}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    throw new AppError('Could not reach the voice platform. Please try again.', 502, 'VAPI_NETWORK_ERROR');
  }

  const text = await res.text();
  let parsed;
  try {
    parsed = text ? JSON.parse(text) : {};
  } catch {
    parsed = text;
  }

  if (!res.ok) {
    const { status, message } = sanitizeVapiError(res.status, parsed);
    throw new AppError(message, status >= 400 && status < 600 ? status : 502, 'VAPI_REQUEST_FAILED');
  }

  return parsed;
}

export async function createAssistant(payload, vapiConfig) {
  const data = await vapiRequest('POST', '/assistant', payload, vapiConfig);
  if (!data || !data.id) {
    throw new AppError('Voice platform did not return an assistant id.', 502, 'VAPI_BAD_RESPONSE');
  }
  return data;
}

export async function updateAssistant(assistantId, payload, vapiConfig) {
  return vapiRequest('PATCH', `/assistant/${assistantId}`, payload, vapiConfig);
}

export async function deleteAssistant(assistantId, vapiConfig) {
  return vapiRequest('DELETE', `/assistant/${assistantId}`, vapiConfig);
}

export async function getAssistant(assistantId, vapiConfig) {
  return vapiRequest('GET', `/assistant/${assistantId}`, vapiConfig);
}
