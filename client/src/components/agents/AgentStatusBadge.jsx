import { Badge } from '../ui/Badge.jsx';
import { STATUS_LABELS } from '../../utils/agentHelpers.js';

export function AgentStatusBadge({ status }) {
  return (
    <Badge tone={status} dot>
      {STATUS_LABELS[status] || status}
    </Badge>
  );
}
