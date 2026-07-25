import mongoose from 'mongoose';
import crypto from 'crypto';
import { ASSIGNABLE_ROLES } from '../config/roles.js';

export const INVITE_TTL_DAYS = 7;

/**
 * A pending invitation to join a workspace.
 *
 * The token is stored in the clear on purpose: no mail provider is wired up yet,
 * so admins share the link themselves and need to be able to copy it again after
 * the dialog closes. It is still a narrow credential — single-use, expiring, and
 * revocable at any time. Once invites are emailed, store a hash instead and drop
 * the link from the list response.
 */
const workspaceInviteSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
      index: true,
    },
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    role: { type: String, enum: ASSIGNABLE_ROLES, default: 'member' },

    token: { type: String, required: true, unique: true, index: true },

    invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    invitedByName: { type: String, default: '' },

    status: {
      type: String,
      enum: ['pending', 'accepted', 'revoked'],
      default: 'pending',
      index: true,
    },

    expiresAt: { type: Date, required: true },
    acceptedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    acceptedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

workspaceInviteSchema.index({ workspaceId: 1, email: 1, status: 1 });

export function generateInviteToken() {
  return crypto.randomBytes(24).toString('base64url');
}

export function inviteExpiry(from = new Date()) {
  return new Date(from.getTime() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);
}

workspaceInviteSchema.methods.isUsable = function isUsable() {
  return this.status === 'pending' && this.expiresAt > new Date();
};

workspaceInviteSchema.methods.toJSONView = function toJSONView(inviteUrl = '') {
  return {
    id: this._id.toString(),
    email: this.email,
    role: this.role,
    status: this.expiresAt <= new Date() && this.status === 'pending' ? 'expired' : this.status,
    invitedByName: this.invitedByName,
    expiresAt: this.expiresAt,
    createdAt: this.createdAt,
    ...(inviteUrl ? { inviteUrl } : {}),
  };
};

export const WorkspaceInvite = mongoose.model('WorkspaceInvite', workspaceInviteSchema);
