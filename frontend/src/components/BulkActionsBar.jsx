import { useState } from 'react'

/** Bulk selection toolbar on Tasks page (ia.md: reusable components). */
export default function BulkActionsBar({
  selectedCount,
  selectedTasks,
  tasks,
  onBulkDelete,
  onBulkStatusChange,
  onBulkArchive,
  onBulkUnarchive,
  onClear,
}) {
  const [showStatusDropdown, setShowStatusDropdown] = useState(false)

  const allSelectedCompleted =
    selectedTasks.size > 0 &&
    Array.from(selectedTasks).every((id) => {
      const task = tasks.find((t) => t.id === id)
      return task?.isCompleted
    })

  const allSelectedArchived =
    selectedTasks.size > 0 &&
    Array.from(selectedTasks).every((id) => {
      const task = tasks.find((t) => t.id === id)
      return task?.isArchived
    })

  const statusOptions = [
    { value: 'Active', label: 'Active' },
    { value: 'InProgress', label: 'In Progress' },
    { value: 'OnHold', label: 'On Hold' },
    { value: 'Completed', label: 'Completed' },
    { value: 'Cancelled', label: 'Cancelled' },
  ]

  return (
    <div className="alert alert-info d-flex justify-content-between align-items-center mb-3">
      <span className="fw-semibold">{selectedCount} task(s) selected</span>
      <div className="d-flex gap-2 flex-wrap">
        <button type="button" className="btn btn-sm btn-danger" onClick={onBulkDelete}>
          🗑️ Delete Selected
        </button>
        {allSelectedCompleted && !allSelectedArchived && (
          <button type="button" className="btn btn-sm btn-primary" onClick={onBulkArchive}>
            📦 Archive Selected
          </button>
        )}
        {allSelectedArchived && (
          <button type="button" className="btn btn-sm btn-info" onClick={onBulkUnarchive}>
            📤 Unarchive Selected
          </button>
        )}
        <div className="position-relative">
          <button
            type="button"
            className="btn btn-sm btn-primary d-flex align-items-center gap-1"
            onClick={() => setShowStatusDropdown(!showStatusDropdown)}
            title="Change status of selected tasks"
            style={{
              minWidth: '140px',
              justifyContent: 'space-between',
            }}
          >
            <span>📋 Change Status</span>
            <span style={{ fontSize: '0.7rem', opacity: 0.8 }}>{showStatusDropdown ? '▲' : '▼'}</span>
          </button>
          {showStatusDropdown && (
            <>
              <div
                className="position-fixed"
                style={{
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  zIndex: 999,
                }}
                aria-hidden="true"
                onClick={() => setShowStatusDropdown(false)}
              />
              <div
                className="position-absolute border rounded shadow-lg p-1 mt-1 status-dropdown-menu"
                style={{
                  zIndex: 1000,
                  minWidth: '180px',
                  top: '100%',
                  left: 0,
                  backgroundColor: 'var(--bs-body-bg)',
                  borderColor: 'var(--bs-border-color)',
                }}
              >
                {statusOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className="btn btn-sm w-100 text-start d-flex align-items-center gap-2"
                    onClick={() => {
                      onBulkStatusChange(option.value)
                      setShowStatusDropdown(false)
                    }}
                    style={{
                      fontSize: '0.875rem',
                      padding: '0.375rem 0.5rem',
                      border: 'none',
                      background: 'transparent',
                      color: 'var(--bs-body-color)',
                      borderRadius: '0.25rem',
                      transition: 'background-color 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.background = 'var(--bs-tertiary-bg, var(--bs-secondary-bg))'
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.background = 'transparent'
                    }}
                  >
                    <span>{option.label}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
        <button type="button" className="btn btn-sm btn-outline-primary" onClick={onClear}>
          Clear
        </button>
      </div>
    </div>
  )
}
