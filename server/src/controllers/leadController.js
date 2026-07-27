import { Lead } from '../models/Lead.js';
import { ok, AppError } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { leadUpdateSchema } from '../validators/agentValidator.js';

/** Leads are shared across the workspace — scope by that, not the caller. */
async function getWorkspaceLead(id, workspaceId) {
  const lead = await Lead.findOne({ _id: id, workspaceId });
  if (!lead) throw new AppError('Lead not found.', 404, 'LEAD_NOT_FOUND');
  return lead;
}

/** GET /api/leads — the workspace's captured leads, newest activity first. */
export const listLeads = asyncHandler(async (req, res) => {
  const { agentId, channel, status, search } = req.query;
  const query = { workspaceId: req.workspaceId };
  if (agentId) query.agentId = agentId;
  if (channel && ['chat', 'call'].includes(channel)) query.channel = channel;
  if (status && ['new', 'contacted', 'qualified', 'closed'].includes(status)) query.status = status;
  if (search) {
    const rx = new RegExp(String(search).slice(0, 60).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    query.$or = [{ name: rx }, { email: rx }, { phone: rx }, { summary: rx }, { agentName: rx }];
  }
  const leads = await Lead.find(query).sort({ lastActivityAt: -1 }).limit(500);
  return ok(res, { leads: leads.map((l) => l.toJSONView()) });
});

/** GET /api/leads/summary — quick counts for the header. */
export const leadsSummary = asyncHandler(async (req, res) => {
  const scope = { workspaceId: req.workspaceId };
  const [total, newCount, chat, call] = await Promise.all([
    Lead.countDocuments(scope),
    Lead.countDocuments({ ...scope, status: 'new' }),
    Lead.countDocuments({ ...scope, channel: 'chat' }),
    Lead.countDocuments({ ...scope, channel: 'call' }),
  ]);
  return ok(res, { total, new: newCount, chat, call });
});

/** GET /api/leads/:id */
export const getLead = asyncHandler(async (req, res) => {
  const lead = await getWorkspaceLead(req.params.id, req.workspaceId);
  return ok(res, { lead: lead.toJSONView() });
});

/** PATCH /api/leads/:id — update status / edit captured contact details. */
export const updateLead = asyncHandler(async (req, res) => {
  const lead = await getWorkspaceLead(req.params.id, req.workspaceId);
  const updates = leadUpdateSchema.parse(req.body);
  Object.assign(lead, updates);
  await lead.save();
  return ok(res, { lead: lead.toJSONView() }, 'Lead updated.');
});

/** DELETE /api/leads/:id */
export const deleteLead = asyncHandler(async (req, res) => {
  const lead = await getWorkspaceLead(req.params.id, req.workspaceId);
  await lead.deleteOne();
  return ok(res, {}, 'Lead deleted.');
});
