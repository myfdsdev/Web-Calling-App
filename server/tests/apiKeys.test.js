import { describe, it, expect, afterEach } from '@jest/globals';
import request from 'supertest';
import { app, makeUser, completeDraft, mockVapi } from './helpers.js';
import { WorkspaceApiKeys } from '../src/models/WorkspaceApiKeys.js';
import { decryptSecret } from '../src/utils/secretCrypto.js';
import { env } from '../src/config/env.js';
import { resolveVapiConfig, resolveGeminiConfig } from '../src/services/apiKeyService.js';

const tokenOf = (inviteUrl) => inviteUrl.split('/invite/')[1];

async function personalWorkspace(user) {
  const list = await user.bearer(request(app).get('/api/workspaces'));
  return list.body.data.workspaces.find((w) => w.isPersonal);
}

describe('BYOK API keys', () => {
  let vapi;
  afterEach(() => {
    if (vapi) vapi.restore();
    vapi = null;
  });

  it('starts unconfigured and reports the system fallback', async () => {
    const user = await makeUser();
    const ws = await personalWorkspace(user);
    const res = await user.bearer(request(app).get(`/api/workspaces/${ws.id}/api-keys`));
    expect(res.status).toBe(200);
    const keys = res.body.data.apiKeys;
    expect(keys.vapi.configured).toBe(false);
    expect(keys.gemini.configured).toBe(false);
    // Tests set system env keys, so the fallback flag is on.
    expect(keys.systemFallback.vapi).toBe(true);
  });

  it('saves keys encrypted, masks them, and never returns the secrets', async () => {
    const user = await makeUser();
    const ws = await personalWorkspace(user);

    const res = await user.bearer(request(app).put(`/api/workspaces/${ws.id}/api-keys`)).send({
      vapiPrivateKey: 'vapi-private-ABCD1234',
      vapiPublicKey: 'vapi-public-visible',
      geminiApiKey: 'gemini-secret-WXYZ9876',
    });
    expect(res.status).toBe(200);
    const keys = res.body.data.apiKeys;
    expect(keys.vapi.configured).toBe(true);
    expect(keys.vapi.hint).toBe('••••1234');
    expect(keys.vapi.publicKey).toBe('vapi-public-visible'); // public key is browser-safe
    expect(keys.gemini.configured).toBe(true);
    expect(keys.gemini.hint).toBe('••••9876');

    // The private secrets must NOT appear anywhere in the response.
    const dump = JSON.stringify(res.body);
    expect(dump).not.toContain('vapi-private-ABCD1234');
    expect(dump).not.toContain('gemini-secret-WXYZ9876');

    // Stored encrypted at rest, and decrypts back to the original.
    const doc = await WorkspaceApiKeys.findOne({ workspaceId: ws.id });
    expect(doc.vapiPrivateKeyEnc).not.toContain('vapi-private');
    expect(decryptSecret(doc.vapiPrivateKeyEnc)).toBe('vapi-private-ABCD1234');
    expect(decryptSecret(doc.geminiApiKeyEnc)).toBe('gemini-secret-WXYZ9876');
  });

  it('clears a single provider key', async () => {
    const user = await makeUser();
    const ws = await personalWorkspace(user);
    await user.bearer(request(app).put(`/api/workspaces/${ws.id}/api-keys`)).send({
      vapiPrivateKey: 'vp-123456',
      geminiApiKey: 'gm-123456',
    });

    const del = await user.bearer(request(app).delete(`/api/workspaces/${ws.id}/api-keys/gemini`));
    expect(del.status).toBe(200);
    expect(del.body.data.apiKeys.gemini.configured).toBe(false);
    expect(del.body.data.apiKeys.vapi.configured).toBe(true); // untouched
  });

  it('rejects an unknown provider on clear', async () => {
    const user = await makeUser();
    const ws = await personalWorkspace(user);
    const res = await user.bearer(request(app).delete(`/api/workspaces/${ws.id}/api-keys/openai`));
    expect(res.status).toBe(422);
    expect(res.body.code).toBe('UNKNOWN_PROVIDER');
  });

  it('blocks members from viewing or managing keys', async () => {
    const owner = await makeUser();
    await owner.bearer(request(app).post('/api/billing/plan')).send({ planId: 'pro' });
    const member = await makeUser();

    const ws = (await owner.bearer(request(app).post('/api/workspaces')).send({ name: 'Acme' })).body.data
      .workspace;
    const inv = await owner
      .bearer(request(app).post(`/api/workspaces/${ws.id}/invites`))
      .send({ email: member.user.email, role: 'member' });
    await member.bearer(request(app).post(`/api/invites/${tokenOf(inv.body.data.invite.inviteUrl)}/accept`));

    const read = await member.bearer(request(app).get(`/api/workspaces/${ws.id}/api-keys`));
    expect(read.status).toBe(403);

    const write = await member
      .bearer(request(app).put(`/api/workspaces/${ws.id}/api-keys`))
      .send({ vapiPrivateKey: 'sneaky' });
    expect(write.status).toBe(403);
  });

  it('strict BYOK ignores the system env keys entirely', async () => {
    const user = await makeUser();
    const ws = await personalWorkspace(user);

    // Non-strict (the test default): system env keys ARE used as a fallback.
    const vapiLoose = await resolveVapiConfig(ws.id);
    expect(vapiLoose.privateKey).toBeTruthy();
    expect(vapiLoose.isByo).toBe(false);

    // Flip strict BYOK on: the same workspace (no own keys) now resolves to nothing.
    env.requireByok = true;
    try {
      const vapi = await resolveVapiConfig(ws.id);
      expect(vapi.privateKey).toBe(''); // system key NOT used
      expect(vapi.publicKey).toBe(''); // system public key NOT used
      const gemini = await resolveGeminiConfig(ws.id);
      expect(gemini.enabled).toBe(false); // system Gemini NOT used
    } finally {
      env.requireByok = false; // restore for the rest of the suite
    }
  });

  it('strict BYOK: the public chat widget is unavailable without a workspace Gemini key', async () => {
    const user = await makeUser();

    // Build + publish an agent first (non-strict, so the mocked system Vapi works).
    vapi = mockVapi({ createId: 'asst_strictchat' });
    const { draftId } = await completeDraft(user);
    const created = await user.bearer(
      request(app).post(`/api/agent-builder/drafts/${draftId}/create-vapi-agent`)
    );
    const agent = created.body.data.agent; // public by default

    // Now enforce strict BYOK: the workspace has NO Gemini key of its own.
    env.requireByok = true;
    try {
      const chat = await request(app)
        .post(`/api/public/agents/${agent.publicId}/chat`)
        .send({ sessionId: 'sc1', messages: [{ role: 'user', content: 'hello?' }] });
      expect(chat.status).toBe(200);
      // No system key is used, so the widget reports itself unavailable.
      expect(chat.body.data.unavailable).toBe(true);
    } finally {
      env.requireByok = false;
    }
  });

  it('runs public chat on the workspace Gemini key without charging app credits', async () => {
    const user = await makeUser();
    const ws = await personalWorkspace(user);

    // Publish an agent first (system keys, no BYO yet — fast deterministic build).
    vapi = mockVapi({ createId: 'asst_byo' });
    const { draftId } = await completeDraft(user);
    const created = await user.bearer(
      request(app).post(`/api/agent-builder/drafts/${draftId}/create-vapi-agent`)
    );
    const agent = created.body.data.agent;
    await user.bearer(request(app).patch(`/api/agents/${agent.id}`)).send({ isPublic: true });

    // Now the workspace brings its OWN Gemini key → the visitor's chat runs on it.
    await user.bearer(request(app).put(`/api/workspaces/${ws.id}/api-keys`)).send({
      geminiApiKey: 'gm-byo-workspace-key',
    });

    const billing = () => user.bearer(request(app).get('/api/billing/me'));
    const before = (await billing()).body.data.credits.total;

    const chat = await request(app)
      .post(`/api/public/agents/${agent.publicId}/chat`)
      .send({ sessionId: 'byo1', messages: [{ role: 'user', content: 'hello there' }] });
    expect(chat.status).toBe(200);
    expect(chat.body.data.unavailable).toBeUndefined();

    const after = (await billing()).body.data.credits.total;
    expect(after).toBe(before); // BYO usage → app charges nothing
  });
});
