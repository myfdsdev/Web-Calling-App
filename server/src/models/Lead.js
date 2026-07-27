import mongoose from 'mongoose';

const lineSchema = new mongoose.Schema({ role: String, content: String }, { _id: false });

/**
 * A lead captured whenever a visitor interacts with a published agent on its
 * public page — via text chat or a browser voice call. One lead per widget
 * session; it's enriched (transcript, contact details) as the session goes on.
 */
const leadSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    // Workspace the lead belongs to (mirrors the agent's). Nullable for leads
    // captured before workspaces existed, until they're adopted.
    workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', index: true, default: null },
    agentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Agent', index: true },
    agentName: { type: String, default: '' },
    publicId: { type: String, default: '' },

    // Widget session id — dedupes repeated messages/calls into one lead.
    sessionId: { type: String, default: '', index: true },

    // How the visitor engaged. `channel` is the latest/primary touchpoint.
    channel: { type: String, enum: ['chat', 'call'], default: 'chat' },
    viaChat: { type: Boolean, default: false },
    viaCall: { type: Boolean, default: false },

    // Contact details parsed out of the conversation (best-effort).
    name: { type: String, default: '' },
    email: { type: String, default: '' },
    phone: { type: String, default: '' },

    transcript: { type: [lineSchema], default: [] },
    summary: { type: String, default: '' },
    messageCount: { type: Number, default: 0 },

    status: {
      type: String,
      enum: ['new', 'contacted', 'qualified', 'closed'],
      default: 'new',
      index: true,
    },

    lastActivityAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

leadSchema.index({ userId: 1, agentId: 1, sessionId: 1 });

leadSchema.methods.toJSONView = function toJSONView() {
  return {
    id: this._id.toString(),
    agentId: this.agentId ? this.agentId.toString() : null,
    agentName: this.agentName,
    publicId: this.publicId,
    sessionId: this.sessionId,
    channel: this.channel,
    viaChat: this.viaChat,
    viaCall: this.viaCall,
    name: this.name,
    email: this.email,
    phone: this.phone,
    transcript: this.transcript,
    summary: this.summary,
    messageCount: this.messageCount,
    status: this.status,
    lastActivityAt: this.lastActivityAt,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const Lead = mongoose.model('Lead', leadSchema);
