import mongoose from 'mongoose';

/**
 * Append-only credit ledger. Every grant, top-up and spend is recorded so a
 * user's balance can always be explained (and usage reported per month).
 */
const creditTransactionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    // grant  = monthly plan allowance
    // topup  = purchased pack
    // usage  = spent on a call / chat  (amount is negative)
    // adjust = manual correction
    type: { type: String, enum: ['grant', 'topup', 'usage', 'adjust'], required: true, index: true },

    // Positive for grants/top-ups, negative for usage.
    amount: { type: Number, required: true },
    balanceAfter: { type: Number, default: 0 },

    // What consumed it: 'call' | 'chat' | 'plan' | 'pack'
    source: { type: String, default: '' },
    reason: { type: String, default: '' },

    agentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Agent', default: null },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

creditTransactionSchema.index({ userId: 1, createdAt: -1 });

creditTransactionSchema.methods.toJSONView = function toJSONView() {
  return {
    id: this._id.toString(),
    type: this.type,
    amount: this.amount,
    balanceAfter: this.balanceAfter,
    source: this.source,
    reason: this.reason,
    agentId: this.agentId ? this.agentId.toString() : null,
    createdAt: this.createdAt,
  };
};

export const CreditTransaction = mongoose.model('CreditTransaction', creditTransactionSchema);
