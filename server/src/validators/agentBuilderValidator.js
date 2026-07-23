import { z } from 'zod';

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
