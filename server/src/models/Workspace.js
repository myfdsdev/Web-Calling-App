import mongoose from 'mongoose';

/**
 * A workspace is the container everything belongs to: agents, drafts and leads
 * are scoped to one, and teammates are invited into one.
 *
 * `ownerId` is the billing account — plan, credits and the ledger all live on
 * that user, so every member of a workspace spends the owner's credits.
 * Each account gets one `isPersonal` workspace automatically; it can be renamed
 * but never deleted, so a user always has somewhere to land.
 */
const workspaceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    isPersonal: { type: Boolean, default: false },
    color: { type: String, default: '#6C5CE7' },
  },
  { timestamps: true }
);

// Exactly one personal workspace per account — the partial filter lets an owner
// still have any number of regular workspaces alongside it.
workspaceSchema.index(
  { ownerId: 1, isPersonal: 1 },
  { unique: true, partialFilterExpression: { isPersonal: true } }
);

/** `extra` carries request-specific context (the caller's role, member counts…). */
workspaceSchema.methods.toJSONView = function toJSONView(extra = {}) {
  return {
    id: this._id.toString(),
    name: this.name,
    color: this.color || '#6C5CE7',
    isPersonal: this.isPersonal,
    ownerId: this.ownerId.toString(),
    createdAt: this.createdAt,
    ...extra,
  };
};

export const Workspace = mongoose.model('Workspace', workspaceSchema);
