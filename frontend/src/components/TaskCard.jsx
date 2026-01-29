import { useState } from 'react'
import { useTimer } from '../hooks/useTimer'
import { formatDate } from '../utils/dateFormat'
import TaskHistory from './TaskHistory'

function TaskCard({ task, onEdit, onDelete, onToggleComplete, onDuplicate, onArchive, onUnarchive, isSelected, onSelect, uiFields, dateFormat, onTimeUpdate, onFilterByPriority, onFilterByTag, onFilterByRecurrence, onUpdateStatus }) {
  const [showHistory, setShowHistory] = useState(false)
  const [showStatusDropdown, setShowStatusDropdown] = useState(false)
  const isCompleted = task.isCompleted || task.status === 'Completed' || task.status === 3
  const isCancelled = task.status === 'Cancelled' || task.status === 4
  const isDone = isCompleted || isCancelled // Both completed and cancelled are "done" states
  const isActive = task.status === 'Active' || task.status === 0 || (!task.status && !isDone)
  const isBlocked = task?.canStart === false && task?.dependsOnTaskIds && task.dependsOnTaskIds.length > 0
  const blockedTitle = 'This task is blocked. Complete its dependencies first.'
  
  const getDueDateStatus = () => {
    if (!task.dueDate || isCompleted || task.status === 'Cancelled' || task.status === 4) return null
    
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const dueDate = new Date(task.dueDate)
    dueDate.setHours(0, 0, 0, 0)
    
    const diffTime = dueDate - today
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays < 0) return 'overdue' // Past due date
    if (diffDays === 0) return 'today' // Due today
    if (diffDays === 1) return 'tomorrow' // Due tomorrow
    return null
  }
  
  const dueDateStatus = getDueDateStatus()
  const isOverdue = dueDateStatus === 'overdue' || dueDateStatus === 'today'
  const fields = uiFields || {
    description: true,
    priority: true,
    recurrence: true,
    notes: true,
    dueDate: true,
    attachment: true
  }

  const handleTimeUpdate = (newTime) => {
    if (onTimeUpdate) {
      onTimeUpdate(task.id, newTime)
    }
  }

  const timer = useTimer(task.id, task.timeSpentSeconds || 0, handleTimeUpdate)
  
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 2: return 'badge bg-danger'
      case 1: return 'badge bg-warning'
      case 0: return 'badge bg-info'
      default: return 'badge bg-secondary'
    }
  }
  
  const getPriorityText = (priority) => {
    switch (priority) {
      case 2: return 'High'
      case 1: return 'Medium'
      case 0: return 'Low'
      default: return 'Medium'
    }
  }

  const getTagStyle = (tagName) => {
    const color = task.tags?.[tagName] || '#6c757d'
    return { backgroundColor: color, color: '#fff', border: 'none' }
  }

  const getStatusColor = (status) => {
    const statusValue = typeof status === 'number' ? status : 
      status === 'Blocked' ? 5 :
      status === 'Active' ? 0 :
      status === 'InProgress' ? 1 :
      status === 'OnHold' ? 2 :
      status === 'Completed' ? 3 :
      status === 'Cancelled' ? 4 : 0
    
    switch (statusValue) {
      case 0: return 'badge bg-primary'
      case 1: return 'badge bg-info'
      case 2: return 'badge bg-warning'
      case 3: return 'badge bg-success'
      case 4: return 'badge bg-secondary'
      case 5: return 'badge bg-warning'
      default: return 'badge bg-primary'
    }
  }

  const getStatusText = (status) => {
    const statusValue = typeof status === 'number' ? status : 
      status === 'Blocked' ? 5 :
      status === 'Active' ? 0 :
      status === 'InProgress' ? 1 :
      status === 'OnHold' ? 2 :
      status === 'Completed' ? 3 :
      status === 'Cancelled' ? 4 : 0
    
    switch (statusValue) {
      case 0: return 'Active'
      case 1: return 'In Progress'
      case 2: return 'On Hold'
      case 3: return 'Completed'
      case 4: return 'Cancelled'
      case 5: return 'Blocked'
      default: return 'Active'
    }
  }

  const formatTimeMinutes = (minutes) => {
    if (minutes < 60) {
      return `${minutes}m`
    }
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
  }

  const statusOptions = [
    { value: 'Active', label: 'Active' },
    { value: 'InProgress', label: 'In Progress' },
    { value: 'OnHold', label: 'On Hold' },
    { value: 'Completed', label: 'Completed' },
    { value: 'Cancelled', label: 'Cancelled' }
  ]

  const currentStatus = task.status || task.statusName || (task.isCompleted ? 'Completed' : 'Active')
  const currentStatusValue = typeof currentStatus === 'number' 
    ? ['Active', 'InProgress', 'OnHold', 'Completed', 'Cancelled'][currentStatus] || 'Active'
    : currentStatus

  const effectiveStatus = isBlocked ? 'Blocked' : currentStatus
  const canChangeStatus = !!onUpdateStatus && !isBlocked
  const statusTitle = isBlocked
    ? blockedTitle
    : (onUpdateStatus ? 'Click to change status' : getStatusText(currentStatus))

  const handleStatusChange = async (newStatus) => {
    if (onUpdateStatus && !isBlocked) {
      await onUpdateStatus(task.id, newStatus)
    }
    setShowStatusDropdown(false)
  }

  const handleTimerStart = async () => {
    if (isBlocked) return
    await timer.start()
    // Auto-change status to "In Progress" when timer starts
    if (onUpdateStatus && currentStatusValue !== 'InProgress') {
      await onUpdateStatus(task.id, 'InProgress')
    }
  }

  const handleTimerStop = async () => {
    await timer.stop()
    // Auto-change status from "In Progress" to "On Hold" when timer stops (pausing work)
    if (!isBlocked && onUpdateStatus && currentStatusValue === 'InProgress') {
      await onUpdateStatus(task.id, 'OnHold')
    }
  }

  return (
    <div data-task-id={task.id}>
      <div className={`card h-100 task-card-hover ${isDone ? 'task-completed' : ''} ${isSelected ? 'border-primary border-2' : ''}`}>
        <div className="card-body">
          <div className="d-flex align-items-center gap-2 mb-2">
            {onSelect && (
              <div className="form-check flex-shrink-0">
                <input
                  className="form-check-input task-select-checkbox"
                  type="checkbox"
                  checked={isSelected || false}
                  onChange={() => onSelect(task.id)}
                  style={{ 
                    minWidth: '1.25rem', 
                    minHeight: '1.25rem',
                    cursor: 'pointer',
                    opacity: isSelected ? 1 : 0.3,
                    transition: 'opacity 0.2s'
                  }}
                  title="Select task"
                />
              </div>
            )}
            <h5 className={`card-title mb-0 flex-grow-1 text-truncate ${isDone ? 'text-decoration-line-through text-muted' : ''}`} title={task.title}>
              {task.title}
            </h5>
            <div className="position-relative flex-shrink-0 d-flex align-items-center">
              <span 
                className={`${getStatusColor(effectiveStatus)} d-inline-flex align-items-center`} 
                style={{ cursor: canChangeStatus ? 'pointer' : (isBlocked ? 'not-allowed' : 'default') }}
                title={statusTitle}
                onClick={() => canChangeStatus && setShowStatusDropdown(!showStatusDropdown)}
              >
                <span>{getStatusText(effectiveStatus)}</span>
                {canChangeStatus && <small style={{ fontSize: '0.65rem', marginLeft: '4px', opacity: 0.8, lineHeight: '1' }}>▼</small>}
              </span>
              {showStatusDropdown && canChangeStatus && (
                <>
                  <div 
                    className="position-fixed"
                    style={{ 
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      zIndex: 999
                    }}
                    onClick={() => setShowStatusDropdown(false)}
                  />
                  <div 
                    className="position-absolute border rounded shadow-sm p-1 mt-1"
                    style={{ 
                      zIndex: 1000, 
                      minWidth: '150px',
                      top: '100%',
                      right: 0,
                      backgroundColor: 'var(--bs-body-bg)',
                      borderColor: 'var(--bs-border-color)'
                    }}
                  >
                    {statusOptions.map(option => (
            <button
                        key={option.value}
              type="button"
                        className={`btn btn-sm w-100 text-start ${currentStatusValue === option.value ? 'bg-primary text-white' : ''}`}
                        onClick={() => handleStatusChange(option.value)}
                        style={{ 
                          fontSize: '0.875rem',
                          padding: '0.25rem 0.5rem',
                          border: 'none',
                          background: currentStatusValue === option.value ? 'var(--bs-primary)' : 'transparent',
                          borderRadius: '0.25rem'
                        }}
                        onMouseEnter={(e) => {
                          if (currentStatusValue !== option.value) {
                            e.target.style.background = 'var(--bs-gray-100)'
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (currentStatusValue !== option.value) {
                            e.target.style.background = 'transparent'
                          }
                        }}
                      >
                        {option.label}
            </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
          <style>{`
            .task-card-hover:hover .task-select-checkbox {
              opacity: 0.8 !important;
            }
            /* Day mode (default) - gray background for completed/cancelled tasks */
            .card.task-completed {
              background-color: #f5f5f5 !important;
              background: #f5f5f5 !important;
              border-color: #e0e0e0 !important;
            }
            .card.task-completed .card-body {
              background-color: #f5f5f5 !important;
              background: #f5f5f5 !important;
              opacity: 0.7;
              color: #666 !important;
            }
            /* Dark mode - only apply when data-theme is dark */
            [data-theme="dark"] .card.task-completed {
              background-color: rgba(255, 255, 255, 0.05) !important;
              background: rgba(255, 255, 255, 0.05) !important;
              border-color: #3a3a4e !important;
            }
            [data-theme="dark"] .card.task-completed .card-body {
              background-color: rgba(255, 255, 255, 0.05) !important;
              background: rgba(255, 255, 255, 0.05) !important;
              opacity: 1;
              color: inherit !important;
            }
            .task-card-hover .badge {
              max-width: min(150px, 100%);
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
              display: inline-block;
              min-width: 0;
            }
            .task-card-hover .btn {
              min-width: 0;
              flex-shrink: 1;
            }
            .task-card-hover .btn:not(.flex-fill) {
              max-width: 100%;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
            }
            .task-tags-container {
              min-width: 0;
            }
            .task-tags-container > * {
              min-width: 0;
            }
            @media (max-width: 576px) {
              .task-card-hover .badge {
                max-width: min(120px, 100%);
              }
            }
          `}</style>
          {fields.priority === true && (
            <div className="mb-2">
              <div className="d-flex flex-wrap align-items-center gap-3">
                <div className="d-flex align-items-center gap-2">
                  <small className="text-muted mb-0">Priority:</small>
                  {onFilterByPriority ? (
                    <span 
                      className={`${getPriorityColor(task.priority)}`} 
                      style={{ cursor: 'pointer' }}
                      onClick={(e) => {
                        e.stopPropagation()
                        onFilterByPriority(task.priority)
                      }}
                      title={getPriorityText(task.priority)}
                    >
                      {getPriorityText(task.priority)}
                    </span>
                  ) : (
                    <span className={getPriorityColor(task.priority)} title={getPriorityText(task.priority)}>{getPriorityText(task.priority)}</span>
                  )}
                </div>
                {fields.recurrence === true && task.recurrenceType > 0 && (
                  <div className="d-flex align-items-center gap-2">
                    <small className="text-muted mb-0">Repeat:</small>
                    {onFilterByRecurrence ? (
                      <span 
                        className="badge bg-info" 
                        style={{ cursor: 'pointer' }}
                        onClick={(e) => {
                          e.stopPropagation()
                          onFilterByRecurrence(task.recurrenceType)
                        }}
                        title={task.recurrenceType === 1 ? '🔄 Daily' : task.recurrenceType === 2 ? '🔄 Weekly' : '🔄 Monthly'}
                      >
                        {task.recurrenceType === 1 ? '🔄 Daily' : task.recurrenceType === 2 ? '🔄 Weekly' : '🔄 Monthly'}
                      </span>
                    ) : (
                      <span className="badge bg-info" title={task.recurrenceType === 1 ? '🔄 Daily' : task.recurrenceType === 2 ? '🔄 Weekly' : '🔄 Monthly'}>
                        {task.recurrenceType === 1 ? '🔄 Daily' : task.recurrenceType === 2 ? '🔄 Weekly' : '🔄 Monthly'}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
          {fields.priority === true && task.tags && Object.keys(task.tags).length > 0 && (
            <div className="mb-2 d-flex flex-wrap align-items-center gap-1 task-tags-container">
              <small className="text-muted">Tags:</small>
              {Object.keys(task.tags).map((tag, idx) => (
                onFilterByTag ? (
                  <span 
                    key={idx} 
                    className="badge" 
                    style={{ ...getTagStyle(tag), cursor: 'pointer' }}
                    onClick={(e) => {
                      e.stopPropagation()
                      onFilterByTag(tag)
                    }}
                    title={tag}
                  >
                    {tag}
                  </span>
                ) : (
                  <span key={idx} className="badge" style={getTagStyle(tag)} title={tag}>{tag}</span>
                )
              ))}
            </div>
          )}
          {task.dependsOnTaskIds && task.dependsOnTaskIds.length > 0 && (
            <div className="mb-2">
              <small className="text-muted">Dependencies:</small>
              <div className="ms-1 d-flex flex-wrap gap-1 align-items-center">
                {task.dependsOnTaskTitles && task.dependsOnTaskTitles.length > 0 ? (
                  task.dependsOnTaskTitles.map((title, idx) => (
                    <span
                      key={idx}
                      className="badge bg-secondary"
                      style={{ cursor: onEdit ? 'pointer' : 'default', fontSize: '0.75rem' }}
                      onClick={(e) => {
                        if (onEdit && task.dependsOnTaskIds && task.dependsOnTaskIds[idx]) {
                          e.stopPropagation()
                          onEdit({ id: task.dependsOnTaskIds[idx] })
                        }
                      }}
                      title={onEdit ? 'Click to edit' : title}
                    >
                      {title}
                    </span>
                  ))
                ) : (
                  <small style={{ color: 'inherit', opacity: 0.85 }}>
                    {task.dependsOnTaskIds.length} task(s)
                  </small>
                )}
              </div>
            </div>
          )}
          {task.totalSubtasksCount > 0 && (
            <div className="mb-2">
              <small className="text-muted">Subtasks:</small>
              <small className="ms-1" style={{ color: 'inherit', opacity: 0.85 }}>
                {task.completedSubtasksCount}/{task.totalSubtasksCount} completed
              </small>
              {task.subtasks && task.subtasks.length > 0 && (
                <div className="mt-1">
                  {task.subtasks.map(subtask => (
                    <div key={subtask.id} className="d-flex align-items-center mb-1">
                      <input
                        type="checkbox"
                        className="form-check-input me-2"
                        checked={subtask.isCompleted || subtask.status === 'Completed' || subtask.status === 3}
                        onChange={(e) => {
                          e.stopPropagation()
                          if (onToggleComplete) {
                            onToggleComplete(subtask)
                          }
                        }}
                        style={{ minWidth: '1rem', minHeight: '1rem' }}
                      />
                      <small 
                        className={`flex-grow-1 ${subtask.isCompleted || subtask.status === 'Completed' || subtask.status === 3 ? 'text-decoration-line-through text-muted' : ''}`}
                        style={{ cursor: 'pointer' }}
                        onClick={(e) => {
                          e.stopPropagation()
                          if (onEdit) {
                            onEdit(subtask)
                          }
                        }}
                        title="Click to edit subtask"
                      >
                        {subtask.title}
                      </small>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {fields.priority !== true && ((task.tags && Object.keys(task.tags).length > 0) || (fields.recurrence === true && task.recurrenceType > 0)) && (
            <div className="mb-2 d-flex flex-wrap gap-2 align-items-center">
              {task.tags && Object.keys(task.tags).length > 0 && (
                <div className="d-flex flex-wrap align-items-center gap-1 task-tags-container">
                  <small className="text-muted">Tags:</small>
                  {Object.keys(task.tags).map((tag, idx) => (
                    onFilterByTag ? (
                      <span 
                        key={idx} 
                        className="badge" 
                        style={{ ...getTagStyle(tag), cursor: 'pointer' }}
                        onClick={(e) => {
                          e.stopPropagation()
                          onFilterByTag(tag)
                        }}
                        title={tag}
                      >
                        {tag}
                      </span>
                    ) : (
                      <span key={idx} className="badge" style={getTagStyle(tag)} title={tag}>{tag}</span>
                    )
                  ))}
                </div>
              )}
              {fields.recurrence === true && task.recurrenceType > 0 ? (
                <span className="badge bg-info" title={task.recurrenceType === 1 ? '🔄 Daily' : task.recurrenceType === 2 ? '🔄 Weekly' : '🔄 Monthly'}>
                  {task.recurrenceType === 1 ? '🔄 Daily' : task.recurrenceType === 2 ? '🔄 Weekly' : '🔄 Monthly'}
                </span>
              ) : null}
            </div>
          )}
          {fields.description && task.description && (
            <div className="mb-2">
              <small className="text-muted">Description:</small>
              <span className={`ms-1 ${isDone ? 'text-muted' : ''}`}>
                {task.description}
              </span>
            </div>
          )}
          {fields.notes && task.notes && (
            <div className="mb-2">
              <small className="text-muted">Notes:</small>
              <small className="ms-1 fst-italic" style={{ color: 'inherit', opacity: 0.85 }}>{task.notes}</small>
            </div>
          )}
          {fields.dueDate && task.dueDate && (
            <div className="mb-1 d-flex align-items-center">
              <small className="text-muted">Due Date:</small>
              <small 
                className={`ms-1 ${dueDateStatus === 'overdue' || dueDateStatus === 'today' ? 'text-danger fw-bold' : dueDateStatus === 'tomorrow' ? 'text-warning fw-semibold' : ''}`} 
                style={!dueDateStatus ? { color: 'inherit', opacity: 0.8 } : { cursor: 'help' }}
                title={dueDateStatus === 'overdue' || dueDateStatus === 'today' ? 'Red - Overdue/Today' : dueDateStatus === 'tomorrow' ? 'Yellow - Tomorrow' : undefined}
              >
                {formatDate(task.dueDate, dateFormat || 'MM/DD/YYYY')}
              </small>
            </div>
          )}
          {fields.attachment && task.fileUrl && (
            <div className="mt-2">
              <small className="text-muted">Attachment:</small>
              <a 
                href={task.fileUrl} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-decoration-none ms-1"
              >
                {task.fileName || 'View File'}
              </a>
            </div>
          )}
          <div className="mt-2 d-flex justify-content-between align-items-center">
            <div className="d-flex flex-wrap align-items-center gap-2">
              <div>
                <small className="text-muted">Time Spent:</small>
                <small className="ms-1" style={{ color: 'inherit', opacity: 0.9 }}>
                  {timer.formattedTime}
                  {timer.isRunning && <span className="text-success ms-1 fw-semibold">(running)</span>}
                </small>
              </div>
              {task.estimatedTimeMinutes && (
                <div>
                  <small className="text-muted">Estimated:</small>
                  <small className="ms-1" style={{ color: 'inherit', opacity: 0.9 }}>
                    {formatTimeMinutes(task.estimatedTimeMinutes)}
                    {(() => {
                      const actualMinutes = Math.floor(timer.totalTime / 60)
                      const estimated = task.estimatedTimeMinutes
                      if (actualMinutes > 0) {
                        const diff = actualMinutes - estimated
                        const percent = Math.round((actualMinutes / estimated) * 100)
                        if (diff > 0) {
                          return <span className="text-danger ms-1 fw-semibold">({percent}%, +{diff}m over)</span>
                        } else {
                          return <span className="text-success ms-1 fw-semibold">({percent}%, {Math.abs(diff)}m under)</span>
                        }
                      }
                      return null
                    })()}
                  </small>
                </div>
              )}
            </div>
            <div className="d-flex gap-1">
              {!timer.isRunning ? (
                <button
                  className="btn btn-sm btn-outline-success"
                  onClick={handleTimerStart}
                  title={isBlocked ? blockedTitle : "Start timer (will change status to In Progress)"}
                  disabled={isBlocked}
                >
                  ▶️
                </button>
              ) : (
                <button
                  className="btn btn-sm btn-outline-danger"
                  onClick={handleTimerStop}
                  title={isBlocked ? "Stop timer" : "Stop timer (will change status to On Hold)"}
                >
                  ⏹️
                </button>
              )}
            </div>
          </div>
          <div className="mt-3 d-flex flex-column gap-2">
            <button
              className="btn btn-sm btn-outline-primary"
              onClick={() => onEdit(task)}
            >
              ✏️ Edit
            </button>
            <div className="d-flex gap-2">
              <button
                className="btn btn-sm btn-outline-primary flex-fill"
                onClick={(e) => {
                  e.stopPropagation()
                  setShowHistory(true)
                }}
              >
                📜 History
              </button>
              {onDuplicate && (
                <button
                  className="btn btn-sm btn-outline-primary flex-fill"
                  onClick={() => onDuplicate(task)}
                >
                  📋 Duplicate
                </button>
              )}
            </div>
            {(task.isArchived ? onUnarchive : (isDone && onArchive)) && (
              <button
                className="btn btn-sm btn-outline-primary"
                onClick={() => task.isArchived ? onUnarchive(task.id) : onArchive(task.id)}
              >
                {task.isArchived ? '📤 Unarchive' : '📦 Archive'}
              </button>
            )}
            <button
              className="btn btn-sm btn-outline-danger fw-bold"
              onClick={() => onDelete(task.id)}
            >
              🗑️ Delete
            </button>
          </div>
        </div>
      </div>
      {showHistory && (
        <TaskHistory taskId={task.id} onClose={() => setShowHistory(false)} />
      )}
    </div>
  )
}

export default TaskCard

