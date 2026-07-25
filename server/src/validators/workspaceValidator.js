import { z } from 'zod';
import { ASSIGNABLE_ROLES } from '../config/roles.js';

const hexColor = z
  .string()
  .regex(/^#([0-9a-fA-F]{6})$/, 'Use a hex color like #6C5CE7');

export const createWorkspaceSchema = z.object({
  name: z.string().trim().min(2, 'Give the workspace a name').max(60),
  color: hexColor.optional(),
});

export const updateWorkspaceSchema = z
  .object({
    name: z.string().trim().min(2, 'Give the workspace a name').max(60).optional(),
    color: hexColor.optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'Nothing to update' });

export const inviteSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
  role: z.enum(ASSIGNABLE_ROLES).default('member'),
});

export const updateMemberSchema = z.object({
  role: z.enum(ASSIGNABLE_ROLES),
});
