/** "What's next?" suggestions overlay (Tasks page). */
export default function TasksSuggestionsModal({ open, onClose, loading, suggestions, onPickTask }) {
  if (!open) return null

  return (
    <div
      className="modal show d-block"
      role="dialog"
      aria-modal="true"
      aria-labelledby="suggestions-modal-title"
      tabIndex={-1}
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
    >
      <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
        <div className="modal-content suggestions-panel">
          <div className="modal-header">
            <h5 id="suggestions-modal-title" className="modal-title">
              Suggested next
            </h5>
            <button type="button" className="btn-close" onClick={onClose} aria-label="Close suggestions" />
          </div>
          <div className="modal-body">
            {loading ? (
              <p className="mb-0 text-muted small">Loading…</p>
            ) : suggestions.length === 0 ? (
              <p className="mb-0 text-muted small">No suggestions.</p>
            ) : (
              <ul className="list-unstyled mb-0">
                {suggestions.map((s) => (
                  <li key={s.task?.id} className="border-bottom border-secondary border-opacity-25 last:border-b-0">
                    <button
                      type="button"
                      className="btn btn-link text-start p-2 w-100 text-decoration-none d-flex flex-column align-items-start gap-1"
                      onClick={() => onPickTask(s.task)}
                    >
                      <span>{s.task?.title}</span>
                      {s.reason ? <span className="small text-muted">{s.reason}</span> : null}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
