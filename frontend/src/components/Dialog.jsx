import './Dialog.css'

function Dialog({ isOpen, type = 'alert', title, message, onConfirm, onCancel, inputValue, onInputChange }) {
  if (!isOpen) return null

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && type !== 'prompt') {
      onConfirm()
    } else if (e.key === 'Escape') {
      onCancel?.()
    }
  }

  return (
    <div className="dialog-overlay" onClick={onCancel} onKeyDown={handleKeyDown}>
      <div className="dialog-box" onClick={(e) => e.stopPropagation()}>
        {title && <div className="dialog-title">{title}</div>}
        <div className="dialog-message">{message}</div>
        
        {type === 'prompt' && (
          <input
            type="text"
            className="form-control mt-3"
            value={inputValue || ''}
            onChange={(e) => onInputChange?.(e.target.value)}
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && onConfirm()}
          />
        )}

        <div className="dialog-actions">
          {type === 'confirm' && (
            <>
              <button className="btn btn-outline-secondary" onClick={onCancel}>
                Cancel
              </button>
              <button className="btn btn-danger" onClick={onConfirm} autoFocus>
                Confirm
              </button>
            </>
          )}
          {type === 'alert' && (
            <button className="btn btn-primary" onClick={onConfirm} autoFocus>
              OK
            </button>
          )}
          {type === 'prompt' && (
            <>
              <button className="btn btn-outline-secondary" onClick={onCancel}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={onConfirm}>
                OK
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default Dialog
