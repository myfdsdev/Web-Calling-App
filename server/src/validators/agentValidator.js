import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().min(2, 'Please enter your name').max(80),
  email: z.string().email('Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters').max(200),
});

/** The ID token Google Identity Services hands back in the browser. */
export const googleAuthSchema = z.object({
  credential: z.string().min(20, 'Missing Google credential').max(4000),
});

export const loginSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

<<<<<<< HEAD
/** Request a password-reset link. */
export const forgotPasswordSchema = z.object({
  email: z.string().email('Enter a valid email'),
});

/** Set a new password using a reset token from the emailed link. */
=======
/** Start a password reset. Any string is accepted so the response can't be used
 *  to tell a valid address from an invalid one. */
export const forgotPasswordSchema = z.object({
  email: z.string().min(1, 'Email is required').max(200),
});

/** Complete a password reset. Password policy matches registration (min 6). */
>>>>>>> 0e2846b3adbf20526675d1c0beffa326a1771b96
export const resetPasswordSchema = z.object({
  token: z.string().min(10, 'Missing reset token').max(400),
  password: z.string().min(6, 'Password must be at least 6 characters').max(200),
});

export const updateAgentSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  businessName: z.string().max(120).optional(),
  businessType: z.string().max(80).optional(),
  businessLocation: z.string().max(160).optional(),
  purpose: z.string().max(120).optional(),
  services: z.array(z.string().max(160)).max(30).optional(),
  tone: z.array(z.string()).max(3).optional(),
  languages: z.array(z.string()).max(6).optional(),
  firstMessage: z.string().max(600).optional(),
  escalationInstructions: z.string().max(600).optional(),
  selectedVoiceId: z.string().optional(),
  status: z.enum(['active', 'disabled']).optional(),

  // Public-appearance fields — local only, never sent to Vapi.
  isPublic: z.boolean().optional(),
  tagline: z.string().max(120).optional(),
  bio: z.string().max(600).optional(),
  avatarUrl: z.string().url('Enter a valid image URL').max(500).optional().or(z.literal('')),
  themeColor: z
    .string()
    .regex(/^#([0-9a-fA-F]{6})$/, 'Use a hex color like #6C5CE7')
    .optional(),

  // Public-page builder config — a flexible nested object (hero, sections,
  // footer, custom code). Kept lenient; overall size is guarded in the controller.
  pageSettings: z.record(z.any()).optional(),
});

/** Body for the public text-chat endpoint. */
export const publicChatSchema = z.object({
  sessionId: z.string().max(80).optional(),
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().min(1).max(2000),
      })
    )
    .min(1, 'Say something to start the chat.')
    .max(40),
});

/** Body for the public "a call started" lead ping. */
export const callLeadSchema = z.object({
  sessionId: z.string().max(80).optional(),
});

/** Billing: switch plan / buy a credit pack. */
export const planChangeSchema = z.object({ planId: z.string().min(1).max(40) });
export const topUpSchema = z.object({ packId: z.string().min(1).max(40) });

/** Owner lead update. */
export const leadUpdateSchema = z.object({
  status: z.enum(['new', 'contacted', 'qualified', 'closed']).optional(),
  name: z.string().max(80).optional(),
  email: z.string().max(160).optional(),
  phone: z.string().max(40).optional(),
});
