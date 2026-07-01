import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../api/client';
import StatusBadge from '../components/common/StatusBadge';
import { useAuth } from '../hooks/useAuth';
import { useWebSocket } from '../hooks/useWebSocket';

function imageExtension(url) {
  if (url?.startsWith('data:image/')) {
    return url.slice('data:image/'.length).split(';')[0] || 'png';
  }

  try {
    const ext = new URL(url).pathname.match(/\.(png|jpe?g|webp|gif)$/i)?.[1];
    return ext || 'png';
  } catch {
    return 'png';
  }
}

function imageFileName(post, version) {
  const platform = post?.platform || 'post';
  const versionNumber = version?.version_number || 'image';
  return `${platform}-post-v${versionNumber}.${imageExtension(version?.image_url)}`;
}

function openImage(url) {
  if (!url) return;
  window.open(url, '_blank', 'noopener,noreferrer');
}

async function downloadImage(url, fileName) {
  if (!url) return;
  const link = document.createElement('a');
  let objectUrl = null;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Image request failed');
    const blob = await response.blob();
    objectUrl = URL.createObjectURL(blob);
    link.href = objectUrl;
  } catch {
    link.href = url;
    link.target = '_blank';
  } finally {
    link.download = fileName;
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    link.remove();
    if (objectUrl) setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
  }
}

export default function PostDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [post, setPost] = useState(null);   // latest row (post meta + version)
  const [versions, setVersions] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [approvalStage, setApprovalStage] = useState(null); // from review service — always in sync
  const [approvalState, setApprovalState] = useState(null); // full approval state (for client_feedback)
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Refine panel state (manager_revision stage)
  const [refinedPrompt, setRefinedPrompt] = useState('');
  const [refining, setRefining] = useState(false);
  const [refineError, setRefineError] = useState('');
  const [sendingActiveVersion, setSendingActiveVersion] = useState(false);
  const [sendActiveVersionError, setSendActiveVersionError] = useState('');

  // Version restore state
  const [restoringVersionId, setRestoringVersionId] = useState(null);

  // Schedule state
  const [schedule, setSchedule] = useState(null);
  const [scheduleAt, setScheduleAt] = useState('');
  const [scheduleSubmitting, setScheduleSubmitting] = useState(false);
  const [scheduleError, setScheduleError] = useState('');
  const [scheduleSuccess, setScheduleSuccess] = useState('');
  const [countdown, setCountdown] = useState('');

  const loadIdRef = useRef(0);

  const loadData = useCallback(async () => {
    const callId = ++loadIdRef.current;

    const [contentRes, reviewRes, stateRes, scheduleRes] = await Promise.allSettled([
      apiClient.get(`/api/content/${id}`),
      apiClient.get(`/api/review/${id}`),
      apiClient.get(`/api/review/${id}/state`),
      apiClient.get(`/api/schedule/${id}`),
    ]);

    if (callId !== loadIdRef.current) return;

    if (contentRes.status === 'fulfilled') {
      const rows = contentRes.value.data;
      if (Array.isArray(rows) && rows.length) {
        setPost(rows[0]);
        setVersions(rows);
        const activeRow = rows.find((row) => row.version_id === rows[0].active_version_id) || rows[0];
        setRefinedPrompt(activeRow.image_prompt || '');
      }
    }

    if (reviewRes.status === 'fulfilled') {
      const data = reviewRes.value.data;
      setReviews(Array.isArray(data) ? data : []);
    }

    if (stateRes.status === 'fulfilled') {
      const stateData = stateRes.value.data;
      setApprovalStage(stateData?.current_stage ?? null);
      setApprovalState(stateData ?? null);
    }

    if (scheduleRes.status === 'fulfilled' && scheduleRes.value.data?.schedule) {
      const s = scheduleRes.value.data.schedule;
      setSchedule(s);
      if (s.scheduled_at) {
        const dt = new Date(s.scheduled_at);
        const local = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000)
          .toISOString()
          .slice(0, 16);
        setScheduleAt(local);
      }
    } else {
      setSchedule(null);
    }
  }, [id]);

  useEffect(() => {
    setLoading(true);
    loadData().finally(() => setLoading(false));
  }, [loadData]);

  useWebSocket(({ type, payload }) => {
    if (type === 'POST_STATUS_UPDATED' && String(payload.post_id) === id) {
      loadData();
    }
  });

  // Live countdown
  useEffect(() => {
    if (!schedule?.scheduled_at) { setCountdown(''); return; }
    function tick() {
      const diff = new Date(schedule.scheduled_at) - Date.now();
      if (diff <= 0) { setCountdown('Publishing now…'); return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      const parts = [];
      if (d) parts.push(`${d}d`);
      if (d || h) parts.push(`${h}h`);
      if (d || h || m) parts.push(`${m}m`);
      parts.push(`${s}s`);
      setCountdown(parts.join(' '));
    }
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [schedule?.scheduled_at]);

  async function updateSchedule() {
    if (!scheduleAt) { setScheduleError('Please select a publish date and time.'); return; }
    const selected = new Date(scheduleAt);
    if (selected <= new Date()) { setScheduleError('Scheduled time must be in the future.'); return; }
    setScheduleError('');
    setScheduleSuccess('');
    setScheduleSubmitting(true);
    try {
      await apiClient.patch(`/api/schedule/${id}`, { scheduled_at: selected.toISOString() });
      setScheduleSuccess('Schedule saved. The post will publish automatically at the chosen time.');
      await loadData();
    } catch (err) {
      setScheduleError(err.response?.data?.error || 'Failed to update schedule.');
    } finally {
      setScheduleSubmitting(false);
    }
  }

  const isClient = user?.role === 'client' || user?.role === 'viewer';
  const isManager = !isClient;

  async function submitReview(decision) {
    if (decision !== 'approved' && !feedback.trim()) {
      setSubmitError('Feedback is required when requesting changes.');
      return;
    }
    setSubmitError('');
    setSubmitting(true);
    try {
      await apiClient.post(`/api/review/${id}`, {
        reviewer_id: isClient ? user.user_id : user.manager_id,
        reviewer_role: isClient ? 'client' : 'manager',
        decision,
        feedback_text: feedback.trim() || null,
      });
      setFeedback('');
      await loadData();
    } catch (err) {
      setSubmitError(err.response?.data?.error || 'Review submission failed.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRefineSubmit(e) {
    e.preventDefault();
    if (!refinedPrompt.trim()) { setRefineError('Prompt is required.'); return; }
    setRefineError('');
    setRefining(true);
    try {
      await apiClient.post(`/api/content/${id}/refine`, {
        refined_prompt: refinedPrompt.trim(),
        base_version_id: activeVersion?.version_id || null,
      });
      await loadData();
    } catch (err) {
      setRefineError(err.response?.data?.error || 'Failed to send to AI. Please try again.');
    } finally {
      setRefining(false);
    }
  }

  async function handleSendActiveVersionToClient() {
    if (!activeVersion?.version_id) {
      setSendActiveVersionError('Select a version before sending it to the client.');
      return;
    }

    setSendActiveVersionError('');
    setSendingActiveVersion(true);
    try {
      await apiClient.post(`/api/review/${id}/select-version`, {
        reviewer_id: user.user_id || user.manager_id,
        version_id: activeVersion.version_id,
        platform: post.platform,
        caption_text: activeVersion.caption_text || null,
        image_url: activeVersion.image_url || null,
      });
      await loadData();
    } catch (err) {
      setSendActiveVersionError(err.response?.data?.error || 'Failed to send selected version to the client.');
    } finally {
      setSendingActiveVersion(false);
    }
  }

  async function handleRestoreVersion(versionId) {
    setRestoringVersionId(versionId);
    setRefineError('');
    setSendActiveVersionError('');
    try {
      await apiClient.put(`/api/content/${id}/versions/${versionId}/restore`);
      await loadData();
    } catch (err) {
      console.error('Restore failed:', err.message);
    } finally {
      setRestoringVersionId(null);
    }
  }

  if (loading) {
    return (
      <div className="loading-page">
        <span className="spinner spinner-light" style={{ width: 18, height: 18 }} />
        <span>Loading post…</span>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="page">
        <button
          className="back-link"
          style={{ background: 'none', padding: 0, border: 'none', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: 12.5 }}
          onClick={() => navigate(-1)}
        >
          ← Back
        </button>
        <p style={{ marginTop: 24, color: 'var(--text-muted)', fontSize: 13 }}>Post not found.</p>
      </div>
    );
  }

  const terminalStatus = post.status === 'scheduled' || post.status === 'published';
  const currentStage   = terminalStatus ? post.status : (approvalStage ?? post.status);
  const isManagerReview    = currentStage === 'manager_review';
  const isClientReview     = currentStage === 'client_review';
  const isManagerRevision  = currentStage === 'manager_revision';
  const isRegenerating     = currentStage === 'rejected';
  const canReview = (isManager && isManagerReview) || (isClient && isClientReview);
  const isApproved  = currentStage === 'approved';
  const isScheduled = currentStage === 'scheduled';
  const isPublished = currentStage === 'published';

  // The active version drives the visible image/caption. Rows are sorted newest-first,
  // so using `post` directly would always show the latest version instead.
  const activeVersionId = post.active_version_id;
  const activeVersion = versions.find((v) => v.version_id === activeVersionId) || post;

  // Client feedback that triggered manager_revision (from approval state or last review)
  const clientFeedback = approvalState?.client_feedback
    || reviews.filter((r) => r.reviewer_role === 'client' && r.decision === 'changes_requested').slice(-1)[0]?.feedback_text
    || '';

  return (
    <div className="page">
      <button
        className="back-link"
        style={{ background: 'none', padding: 0, border: 'none', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: 12.5 }}
        onClick={() => navigate(-1)}
      >
        ← Back
      </button>

      <div className="page-header" style={{ marginBottom: 28 }}>
        <h1 className="page-title" style={{ textTransform: 'capitalize' }}>
          {post.platform} post
        </h1>
        <StatusBadge status={currentStage} />
      </div>

      {/* Active generated content */}
      <div className="section">
        <div className="section-header">
          <span className="section-title">Generated Content</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>
            v{activeVersion.version_number}
          </span>
        </div>

        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          {activeVersion.image_url && (
            <div style={{ flex: '0 0 auto', width: 'min(300px, 100%)' }}>
              <img
                src={activeVersion.image_url}
                alt="Generated post visual"
                style={{
                  width: '100%', maxHeight: 300, objectFit: 'contain',
                  borderRadius: 8, border: '1px solid var(--border)',
                  background: 'var(--surface)', display: 'block',
                }}
                onError={(e) => { e.target.style.display = 'none'; }}
              />
              <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => openImage(activeVersion.image_url)}
                >
                  View image
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => downloadImage(activeVersion.image_url, imageFileName(post, activeVersion))}
                >
                  Download
                </button>
              </div>
            </div>
          )}
          <div style={{ flex: '1 1 200px' }}>
            {activeVersion.caption_text ? (
              <p style={{ fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap', color: 'var(--text-primary)', margin: 0 }}>
                {activeVersion.caption_text}
              </p>
            ) : (
              <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>Caption not available.</p>
            )}
          </div>
        </div>
      </div>

      {/* Regenerating notice */}
      {isRegenerating && (
        <div className="section" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span className="spinner spinner-light" style={{ width: 14, height: 14 }} />
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            Content is being regenerated with your feedback…
          </span>
        </div>
      )}

      {/* Manager revision panel — shown when client sent feedback back to manager */}
      {isManager && isManagerRevision && (
        <div className="review-panel">
          <div className="review-panel-title">Choose Next Step</div>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 0, marginBottom: 16, lineHeight: 1.6 }}>
            The client has requested changes. You can regenerate from the active version, make another version active from version history, or send the active version back for client review.
          </p>

          {clientFeedback && (
            <div style={{
              padding: '12px 14px', marginBottom: 16,
              background: 'rgba(255,107,107,0.06)', border: '1px solid rgba(255,107,107,0.2)',
              borderRadius: 'var(--radius-sm)',
            }}>
              <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: '#ff6b6b', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Client Feedback
              </div>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.6 }}>
                "{clientFeedback}"
              </p>
            </div>
          )}

          <form onSubmit={handleRefineSubmit}>
            <div className="field">
              <label className="field-label">Prompt for active version</label>
              <textarea
                className="field-textarea"
                placeholder="Edit the prompt for the active version before sending it to AI…"
                value={refinedPrompt}
                onChange={(e) => setRefinedPrompt(e.target.value)}
                rows={6}
                required
              />
            </div>
            {refineError && (
              <div className="form-error" style={{ marginBottom: 12 }}>{refineError}</div>
            )}
            <div className="review-actions">
              <button type="submit" className="btn btn-primary" disabled={refining}>
                {refining ? <><span className="spinner" />Sending to AI…</> : '✦ Send active version prompt to AI'}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleSendActiveVersionToClient}
                disabled={sendingActiveVersion || refining}
              >
                {sendingActiveVersion ? <><span className="spinner" />Sending…</> : 'Send active version to client'}
              </button>
            </div>
            {sendActiveVersionError && (
              <div className="form-error" style={{ marginTop: 12 }}>{sendActiveVersionError}</div>
            )}
          </form>
        </div>
      )}

      {/* Version History */}
      {versions.length > 1 && (
        <div className="section">
          <div className="section-header">
            <span className="section-title">Version History</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>
              {versions.length} versions
            </span>
          </div>
          <div className="stagger-list">
            {versions.map((v) => {
              const isActive = v.version_id === activeVersionId;
              return (
                <div
                  key={v.version_id}
                  className="version-card"
                  style={isActive ? { border: '1px solid var(--accent)', background: 'rgba(200,255,0,0.04)' } : {}}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span className="version-label">Version {v.version_number}</span>
                    {isActive && (
                      <span style={{
                        fontSize: 10, fontFamily: 'var(--font-mono)', padding: '2px 8px',
                        borderRadius: 20, background: 'rgba(200,255,0,0.15)', color: 'var(--accent)',
                      }}>
                        active
                      </span>
                    )}
                    {isManager && !isActive && (
                      <button
                        className="btn btn-secondary btn-sm"
                        style={{ marginLeft: 'auto', fontSize: 11, padding: '2px 10px' }}
                        onClick={() => handleRestoreVersion(v.version_id)}
                        disabled={restoringVersionId === v.version_id}
                      >
                        {restoringVersionId === v.version_id
                          ? <span className="spinner" style={{ width: 10, height: 10 }} />
                          : 'Make active'}
                      </button>
                    )}
                  </div>
                  {v.revision_notes && (
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
                      Notes: {v.revision_notes}
                    </p>
                  )}
                  <p className="version-content">{v.caption_text}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Review history */}
      <div className="section">
        <div className="section-header">
          <span className="section-title">Review History</span>
        </div>
        {reviews.length ? (
          <div className="stagger-list">
            {reviews.map((r) => (
              <div key={r.id} className="review-item">
                <div className="review-meta">
                  <span className="reviewer-role">{r.reviewer_role}</span>
                  <span style={{ color: 'var(--text-muted)' }}>·</span>
                  <span className="review-decision">{r.decision}</span>
                </div>
                {r.feedback_text && (
                  <p className="review-feedback">"{r.feedback_text}"</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No reviews yet.</p>
        )}
      </div>

      {/* Scheduled info bar */}
      {(isScheduled || isPublished) && schedule && (
        <div className={`schedule-info-bar ${isPublished ? 'schedule-info-bar--published' : ''}`}>
          <span className="schedule-info-icon">{isPublished ? '✓' : '◷'}</span>
          <span className="schedule-info-text">
            {isPublished
              ? `Published on ${new Date(schedule.fired_at || schedule.scheduled_at).toLocaleString()}`
              : `Scheduled to publish on ${new Date(schedule.scheduled_at).toLocaleString()}`}
          </span>
          {isScheduled && isManager && (
            <button
              className="btn btn-ghost btn-sm"
              style={{ marginLeft: 'auto' }}
              onClick={() => setScheduleSuccess('') || document.getElementById('schedule-panel')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Edit schedule
            </button>
          )}
        </div>
      )}

      {/* Schedule panel */}
      {isManager && (isApproved || isScheduled) && (
        <div className="schedule-panel" id="schedule-panel">
          <div className="schedule-panel-title">
            {isScheduled ? 'Update Publish Schedule' : 'Schedule Post'}
          </div>
          <p className="schedule-panel-desc">
            {isScheduled
              ? 'Change the time this post will be automatically published.'
              : 'This post has been approved. Pick a date and time to publish it.'}
          </p>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, flexWrap: 'wrap' }}>
            <div className="field" style={{ minWidth: 240 }}>
              <label className="field-label">Publish date & time</label>
              <input
                type="datetime-local"
                className="field-input"
                value={scheduleAt}
                min={new Date(Date.now() + 60000).toISOString().slice(0, 16)}
                onChange={(e) => {
                  setScheduleAt(e.target.value);
                  setScheduleError('');
                  setScheduleSuccess('');
                }}
              />
            </div>
            {countdown && (
              <div className="countdown-badge">
                <span className="countdown-icon">◷</span>
                {countdown}
              </div>
            )}
          </div>
          {scheduleError && <div className="form-error" style={{ marginTop: 10 }}>{scheduleError}</div>}
          {scheduleSuccess && <div className="schedule-success">{scheduleSuccess}</div>}
          <div style={{ marginTop: 14 }}>
            <button className="btn btn-primary" onClick={updateSchedule} disabled={scheduleSubmitting}>
              {scheduleSubmitting ? <span className="spinner" /> : null}
              {isScheduled ? 'Update Schedule' : 'Confirm Schedule'}
            </button>
          </div>
        </div>
      )}

      {/* Review panel */}
      {canReview && (
        <div className="review-panel">
          <div className="review-panel-title">
            {isClientReview ? 'Client Review' : 'Submit Review'}
          </div>
          <div className="field">
            <label className="field-label">Feedback</label>
            <textarea
              className="field-textarea"
              placeholder={isClientReview
                ? 'Describe what needs to change. Your feedback will go to the manager who will refine the prompt before regenerating.'
                : 'Describe what needs to change so the AI can regenerate with your feedback…'}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={4}
            />
          </div>
          {submitError && (
            <div className="form-error" style={{ marginBottom: 12 }}>{submitError}</div>
          )}
          <div className="review-actions">
            <button className="btn btn-primary" onClick={() => submitReview('approved')} disabled={submitting}>
              {submitting ? <span className="spinner" /> : null}
              ✓ Approve
            </button>
            <button className="btn btn-danger" onClick={() => submitReview('changes_requested')} disabled={submitting}>
              ↺ Request Changes
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
