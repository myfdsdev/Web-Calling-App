import { z } from 'zod';

/**
 * Body for POST /agent-builder/start. A `draftId` means "resume this exact
 * draft" (the page was refreshed mid-conversation). Without it, every visit
 * begins a brand-new agent.
 */
export const startSchema = z.object({
  draftId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid draft id').optional(),
});

export const messageSchema = z.object({
  draftId: z.string().min(1, 'draftId is required'),
  message: z.string().max(2000).optional(),
  value: z.union([z.string(), z.array(z.string())]).optional(),
  values: z.array(z.string()).optional(),
  voiceId: z.string().optional(),
  action: z.string().optional(),
  stepKey: z.string().optional(),
});

export const patchDraftSchema = z.object({
  agentName: z.string().max(80).optional(),
  businessName: z.string().max(120).optional(),
  businessType: z.string().max(80).optional(),
  businessLocation: z.string().max(160).optional(),
  agentPurpose: z.string().max(120).optional(),
  services: z.array(z.string().max(160)).max(30).optional(),
  tone: z.array(z.string()).max(3).optional(),
  languages: z.array(z.string()).max(6).optional(),
  firstMessage: z.string().max(600).optional(),
  escalationInstructions: z.string().max(600).optional(),
  selectedVoiceProvider: z.string().optional(),
  selectedVoiceId: z.string().optional(),
  selectedVoiceName: z.string().optional(),
  currentStep: z.number().int().min(1).max(11).optional(),
});

export const generateGreetingSchema = z.object({
  instructions: z.string().max(400).optional(),
});
