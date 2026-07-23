import mongoose from 'mongoose';

const agentBuilderMessageSchema = new mongoose.Schema(
  {
    draftId: { type: mongoose.Schema.Types.ObjectId, ref: 'AgentDraft', required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    role: { type: String, enum: ['assistant', 'user', 'system'], required: true },
    content: { type: String, default: '' },

    stepKey: { type: String, default: '' },
    // Any structured metadata attached to a message (quick replies, options,
    // generated payloads, ui hints). Free-form on purpose.
    structuredData: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
);

agentBuilderMessageSchema.methods.toJSONView = function toJSONView() {
  return {
    id: this._id.toString(),
    role: this.role,
    content: this.content,
    stepKey: this.stepKey,
    structuredData: this.structuredData,
    createdAt: this.createdAt,
  };
};

export const AgentBuilderMessage = mongoose.model('AgentBuilderMessage', agentBuilderMessageSchema);
