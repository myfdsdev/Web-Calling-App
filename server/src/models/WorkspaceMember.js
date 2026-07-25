import mongoose from 'mongoose';
import { ROLES } from '../config/roles.js';

/**
 * One row per person in a workspace. The workspace owner always has a row too
 * (role `owner`) so membership lookups never need a special case.
 */
const workspaceMemberSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
      index: true,
    },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    role: { type: String, enum: ROLES, default: 'member', index: true },
    invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    joinedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// A person belongs to a workspace exactly once — this also makes accepting the
// same invite twice a no-op instead of a duplicate row.
workspaceMemberSchema.index({ workspaceId: 1, userId: 1 }, { unique: true });

/** `user` is the populated User doc (or null if the account was deleted). */
workspaceMemberSchema.methods.toJSONView = function toJSONView(user = null) {
  const account = user || this.userId;
  const populated = account && account.email;
  return {
    id: this._id.toString(),
    userId: (populated ? account._id : account).toString(),
    name: populated ? account.name : '',
    email: populated ? account.email : '',
    avatarUrl: populated ? account.avatarUrl || '' : '',
    role: this.role,
    joinedAt: this.joinedAt,
  };
};

export const WorkspaceMember = mongoose.model('WorkspaceMember', workspaceMemberSchema);
