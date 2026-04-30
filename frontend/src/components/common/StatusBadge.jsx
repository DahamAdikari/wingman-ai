const STATUS_MAP = {
  draft:           { label: 'Draft',               color: '#9e9e9e' },
  manager_review:  { label: 'Awaiting Your Review', color: '#f9a825' },
  client_review:   { label: 'Sent to Client',       color: '#1e88e5' },
  approved:        { label: 'Approved',              color: '#43a047' },
  scheduled:       { label: 'Scheduled',             color: '#8e24aa' },
  published:       { label: 'Published',             color: '#2e7d32' },
  rejected:        { label: 'Revision Needed',       color: '#e53935' },
};

export default function StatusBadge({ status }) {
  const entry = STATUS_MAP[status] ?? { label: status, color: '#9e9e9e' };
  return (
    <span
      style={{
        backgroundColor: entry.color,
        color: '#fff',
        borderRadius: '4px',
        padding: '2px 8px',
        fontSize: '0.75rem',
        fontWeight: 600,
        marginLeft: '8px',
      }}
    >
      {entry.label}
    </span>
  );
}
