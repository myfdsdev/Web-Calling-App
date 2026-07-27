import mongoose from 'mongoose';
import { genPublicId } from '../utils/ids.js';

const agentSchema = new mongoose.Schema(
  {
    // Billing account: always the WORKSPACE OWNER, so credits, leads and webhook
    // charges land on the account that pays — even when a teammate built the agent.
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    // The workspace the agent lives in (what visibility is scoped by). Nullable
    // only for pre-workspace agents until they're adopted into a personal one.
    workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', index: true, default: null },
    // Who actually created it — for display; billing never uses this.
    createdByUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    name: { type: String, required: true, trim: true },
    businessName: { type: String, default: '' },
    businessType: { type: String, default: '' },
    businessLocation: { type: String, default: '' },

    // ── Public-facing appearance (shown on the shareable /a/:publicId page) ──
    publicId: { type: String, unique: true, sparse: true, default: () => genPublicId() },
    isPublic: { type: Boolean, default: false, index: true },
    tagline: { type: String, default: '' },
    bio: { type: String, default: '' },
    avatarUrl: { type: String, default: '' },
    themeColor: { type: String, default: '#6C5CE7' },

    // Rich public-page builder config (hero, sections, footer, custom code…).
    // Stored as a flexible blob so the form can evolve without schema churn.
    pageSettings: { type: mongoose.Schema.Types.Mixed, default: {} },

    purpose: { type: String, default: '' },
    services: { type: [String], default: [] },

    tone: { type: [String], default: [] },
    languages: { type: [String], default: [] },

    firstMessage: { type: String, default: '' },
    systemPrompt: { type: String, default: '' },

    voiceProvider: { type: String, default: '' },
    voiceId: { type: String, default: '' },
    voiceName: { type: String, default: '' },

    escalationInstructions: { type: String, default: '' },

    vapiAssistantId: { type: String, default: '', index: true },

    status: {
      type: String,
      enum: ['active', 'draft', 'disabled', 'failed'],
      default: 'active',
      index: true,
    },

    // Idempotency guard: one agent per draft prevents duplicate Vapi assistants
    // if the user double-clicks "Create Voice Agent".
    createdFromDraftId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AgentDraft',
      default: null,
      index: true,
    },

    // Lightweight rollup for dashboard metrics (updated by the webhook handler).
    stats: {
      totalCalls: { type: Number, default: 0 },
      callsToday: { type: Number, default: 0 },
      totalCallSeconds: { type: Number, default: 0 },
      lastCallAt: { type: Date, default: null },
      statsDate: { type: String, default: '' }, // YYYY-MM-DD bucket for callsToday
    },
  },
  { timestamps: true }
);

agentSchema.index({ userId: 1, createdFromDraftId: 1 });

agentSchema.methods.toJSONView = function toJSONView() {
  return {
    id: this._id.toString(),
    workspaceId: this.workspaceId ? this.workspaceId.toString() : null,
    createdByUserId: this.createdByUserId ? this.createdByUserId.toString() : null,
    name: this.name,
    businessName: this.businessName,
    businessType: this.businessType,
    businessLocation: this.businessLocation,
    purpose: this.purpose,
    services: this.services,
    tone: this.tone,
    languages: this.languages,
    firstMessage: this.firstMessage,
    systemPrompt: this.systemPrompt,
    voiceProvider: this.voiceProvider,
    voiceId: this.voiceId,
    voiceName: this.voiceName,
    escalationInstructions: this.escalationInstructions,
    vapiAssistantId: this.vapiAssistantId,
    status: this.status,
    publicId: this.publicId,
    isPublic: this.isPublic,
    tagline: this.tagline,
    bio: this.bio,
    avatarUrl: this.avatarUrl,
    themeColor: this.themeColor,
    pageSettings: this.pageSettings || {},
    createdFromDraftId: this.createdFromDraftId ? this.createdFromDraftId.toString() : null,
    stats: this.stats,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

/**
 * Public-safe projection for the shareable page. Deliberately excludes the
 * system prompt, escalation details, owner id, stats and internal ids. The
 * vapiAssistantId + public key ARE included because browser web calling needs
 * them (both are browser-safe by Vapi's design).
 */
agentSchema.methods.toPublicView = function toPublicView() {
  return {
    publicId: this.publicId,
    name: this.name,
    businessName: this.businessName,
    purpose: this.purpose,
    tagline: this.tagline,
    bio: this.bio,
    avatarUrl: this.avatarUrl,
    themeColor: this.themeColor || '#6C5CE7',
    voiceName: this.voiceName,
    languages: this.languages,
    firstMessage: this.firstMessage,
    pageSettings: this.pageSettings || {},
    vapiAssistantId: this.vapiAssistantId,
    status: this.status,
  };
};

export const Agent = mongoose.model('Agent', agentSchema);
