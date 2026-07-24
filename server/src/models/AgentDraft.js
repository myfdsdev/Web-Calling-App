import mongoose from 'mongoose';

const agentDraftSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    agentName: { type: String, default: '' },
    businessName: { type: String, default: '' },
    businessType: { type: String, default: '' },
    businessLocation: { type: String, default: '' },

    agentPurpose: { type: String, default: '' },
    services: { type: [String], default: [] },

    tone: { type: [String], default: [] },
    languages: { type: [String], default: [] },

    firstMessage: { type: String, default: '' },
    escalationInstructions: { type: String, default: '' },

    selectedVoiceProvider: { type: String, default: '' },
    selectedVoiceId: { type: String, default: '' },
    selectedVoiceName: { type: String, default: '' },

    generatedSystemPrompt: { type: String, default: '' },

    currentStep: { type: Number, default: 1 },
    completionPercentage: { type: Number, default: 0 },

    status: {
      type: String,
      enum: ['draft', 'ready-for-review', 'creating', 'created', 'failed'],
      default: 'draft',
      index: true,
    },

    // Populated once the Vapi assistant is created from this draft.
    vapiAssistantId: { type: String, default: '' },
    // Link to the created local Agent record.
    agentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Agent', default: null },
    lastError: { type: String, default: '' },
  },
  { timestamps: true }
);

agentDraftSchema.methods.toJSONView = function toJSONView() {
  return {
    id: this._id.toString(),
    agentName: this.agentName,
    businessName: this.businessName,
    businessType: this.businessType,
    businessLocation: this.businessLocation,
    agentPurpose: this.agentPurpose,
    services: this.services,
    tone: this.tone,
    languages: this.languages,
    firstMessage: this.firstMessage,
    escalationInstructions: this.escalationInstructions,
    selectedVoiceProvider: this.selectedVoiceProvider,
    selectedVoiceId: this.selectedVoiceId,
    selectedVoiceName: this.selectedVoiceName,
    generatedSystemPrompt: this.generatedSystemPrompt,
    currentStep: this.currentStep,
    completionPercentage: this.completionPercentage,
    status: this.status,
    vapiAssistantId: this.vapiAssistantId,
    agentId: this.agentId ? this.agentId.toString() : null,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const AgentDraft = mongoose.model('AgentDraft', agentDraftSchema);
