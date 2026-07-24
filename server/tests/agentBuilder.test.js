import { describe, it, expect } from '@jest/globals';
import request from 'supertest';
import { app, makeUser, completeDraft } from './helpers.js';

describe('Agent Builder conversational flow', () => {
  it('starts a new draft and asks for the agent name first', async () => {
    const user = await makeUser();
    const res = await user.bearer(request(app).post('/api/agent-builder/start'));
    expect(res.status).toBe(200);
    expect(res.body.data.draftId).toBeTruthy();
    expect(res.body.data.resumed).toBe(false);
    expect(res.body.data.assistantMessage.content).toMatch(/name your voice agent/i);
    expect(res.body.data.progress.currentStep).toBe(1);
  });

  it('resumes an existing unfinished draft instead of creating a new one', async () => {
    const user = await makeUser();
    const first = await user.bearer(request(app).post('/api/agent-builder/start'));
    const draftId = first.body.data.draftId;
    await user
      .bearer(request(app).post('/api/agent-builder/message'))
      .send({ draftId, message: 'Emma' });

    const second = await user.bearer(request(app).post('/api/agent-builder/start'));
    expect(second.body.data.resumed).toBe(true);
    expect(second.body.data.draftId).toBe(draftId);
    expect(second.body.data.draft.agentName).toBe('Emma');
    expect(second.body.data.draft.currentStep).toBe(2);
  });

  it('asks one question at a time and advances the step', async () => {
    const user = await makeUser();
    const start = await user.bearer(request(app).post('/api/agent-builder/start'));
    const draftId = start.body.data.draftId;
    const res = await user
      .bearer(request(app).post('/api/agent-builder/message'))
      .send({ draftId, message: 'Emma' });
    expect(res.body.data.draft.currentStep).toBe(2);
    expect(res.body.data.assistantMessage.content).toMatch(/business/i);
    expect(res.body.data.assistantMessage.structuredData.ui.step).toBe(2);
  });

  it('saves every answer and completes the full flow', async () => {
    const user = await makeUser();
    const { body } = await completeDraft(user);
    const draft = body.data.draft;
    expect(body.data.isComplete).toBe(true);
    expect(draft.status).toBe('ready-for-review');
    expect(draft.agentName).toBe('Emma');
    expect(draft.businessName).toBe('Green Valley Real Estate');
    expect(draft.businessType).toBe('Real Estate');
    expect(draft.agentPurpose).toBe('Appointment Booking');
    expect(draft.services).toEqual(expect.arrayContaining(['Property buying', 'Rentals', 'Site visits']));
    expect(draft.tone).toEqual(['Friendly', 'Professional']);
    expect(draft.languages).toEqual(['English', 'Hindi']);
    expect(draft.firstMessage).toMatch(/Green Valley/);
    expect(draft.selectedVoiceId).toBe('Elliot'); // internal 'ava' -> Vapi voiceId
    expect(draft.selectedVoiceName).toBe('Ava');
    expect(draft.completionPercentage).toBe(100);
  });

  it('limits tone selections to three', async () => {
    const user = await makeUser();
    const start = await user.bearer(request(app).post('/api/agent-builder/start'));
    const draftId = start.body.data.draftId;
    const send = (p) => user.bearer(request(app).post('/api/agent-builder/message')).send({ draftId, ...p });
    await send({ message: 'Emma' });
    await send({ message: 'Acme' });
    await send({ value: 'Real Estate' });
    await send({ value: 'Sales Enquiries' });
    await send({ message: 'Consulting' });
    const res = await send({ values: ['Friendly', 'Professional', 'Warm', 'Confident', 'Calm'] });
    expect(res.body.data.draft.tone).toHaveLength(3);
  });

  it('generates a greeting via the dedicated endpoint', async () => {
    const user = await makeUser();
    const start = await user.bearer(request(app).post('/api/agent-builder/start'));
    const draftId = start.body.data.draftId;
    await user.bearer(request(app).post('/api/agent-builder/message')).send({ draftId, message: 'Emma' });
    await user.bearer(request(app).post('/api/agent-builder/message')).send({ draftId, message: 'Green Valley' });
    const res = await user.bearer(
      request(app).post(`/api/agent-builder/drafts/${draftId}/generate-greeting`)
    );
    expect(res.status).toBe(200);
    expect(res.body.data.firstMessage).toMatch(/Green Valley/);
  });

  it('lets the user edit a previous answer without restarting', async () => {
    const user = await makeUser();
    const start = await user.bearer(request(app).post('/api/agent-builder/start'));
    const draftId = start.body.data.draftId;
    await user.bearer(request(app).post('/api/agent-builder/message')).send({ draftId, message: 'Emma' });
    await user.bearer(request(app).post('/api/agent-builder/message')).send({ draftId, message: 'Acme' });

    // Now edit step 1 while currentStep is 3.
    const res = await user
      .bearer(request(app).post('/api/agent-builder/message'))
      .send({ draftId, stepKey: 'agentName', message: 'Aria' });
    expect(res.body.data.draft.agentName).toBe('Aria');
    expect(res.body.data.draft.currentStep).toBe(3); // unchanged
  });

  it('allows editing a field from the review screen (flow already complete)', async () => {
    const user = await makeUser();
    const { draftId } = await completeDraft(user); // ends at review, currentStep = 11
    const res = await user
      .bearer(request(app).post('/api/agent-builder/message'))
      .send({ draftId, stepKey: 'tone', values: ['Professional', 'Warm'] });
    expect(res.status).toBe(200);
    expect(res.body.data.draft.tone).toEqual(['Professional', 'Warm']);
    expect(res.body.data.draft.currentStep).toBe(11); // stays at review, no "Invalid step"
  });

  it('pre-fills draft fields from the welcome popup (use case / template)', async () => {
    const user = await makeUser();
    const start = await user.bearer(request(app).post('/api/agent-builder/start'));
    const draftId = start.body.data.draftId;

    // Free-text use case → purpose only.
    const useCase = await user
      .bearer(request(app).patch(`/api/agent-builder/drafts/${draftId}`))
      .send({ agentPurpose: 'krishna' });
    expect(useCase.status).toBe(200);
    expect(useCase.body.data.draft.agentPurpose).toBe('krishna');

    // Template → purpose + tone + services in one patch.
    const template = await user
      .bearer(request(app).patch(`/api/agent-builder/drafts/${draftId}`))
      .send({
        agentPurpose: 'Customer Support',
        tone: ['Friendly', 'Professional', 'Calm'],
        services: ['Answer product questions', 'Handle complaints'],
      });
    expect(template.status).toBe(200);
    expect(template.body.data.draft.tone).toEqual(['Friendly', 'Professional', 'Calm']);
    expect(template.body.data.draft.currentStep).toBe(1); // pre-fill never advances the flow
  });

  it('exposes the supported voices and never invents ids', async () => {
    const user = await makeUser();
    const res = await user.bearer(request(app).get('/api/agent-builder/voices'));
    expect(res.status).toBe(200);
    expect(res.body.data.voices.length).toBeGreaterThanOrEqual(3);
    res.body.data.voices.forEach((v) => {
      expect(v.provider).toBeTruthy();
      expect(v.voiceId).toBeTruthy();
    });
  });

  it('enforces draft ownership', async () => {
    const owner = await makeUser();
    const intruder = await makeUser();
    const start = await owner.bearer(request(app).post('/api/agent-builder/start'));
    const draftId = start.body.data.draftId;
    const res = await intruder.bearer(request(app).get(`/api/agent-builder/drafts/${draftId}`));
    expect(res.status).toBe(403);
  });
});
