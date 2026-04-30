const STATUS_CONFIG = {
  draft:          { label: 'Draft',          cls: 'status-draft' },
  manager_review: { label: 'Your Review',    cls: 'status-manager_review' },
  client_review:  { label: 'Client Review',  cls: 'status-client_review' },
  approved:       { label: 'Approved',       cls: 'status-approved' },
  scheduled:      { label: 'Scheduled',      cls: 'status-scheduled' },
  published:      { label: 'Published',      cls: 'status-published' },
  rejected:       { label: 'Needs Revision', cls: 'status-rejected' },
};

export default function StatusBadge({ status }) {
  const config = STATUS_CONFIG[status] ?? { label: status || 'Unknown', cls: 'status-draft' };
  return <span className={`status-badge ${config.cls}`}>{config.label}</span>;
}
