import { useState, useEffect, useRef } from 'react'
import { useSettings } from '../hooks/useSettings'
import { useDialog } from '../hooks/useDialog'
import { taskService } from '../services/taskService'
import { tagService } from '../services/tagService'
import Dialog from './Dialog'
import TaskHistory from './TaskHistory'

function SubtaskList({ subtasks, onDeleteSubtask, parentTaskId, onReorderSubtasks, onOrderChange, onToggleComplete, onEditSubtask }) {
  const [draggedSubtaskId, setDraggedSubtaskId] = useState(null)
  const [dragOverIndex, setDragOverIndex] = useState(null)
  const [localSubtasks, setLocalSubtasks] = useState(subtasks)
  const isReorderingRef = useRef(false)
  const lastSubtaskIdsRef = useRef(subtasks.map(s => s.id).sort().join(','))

  useEffect(() => {
    if (!isReorderingRef.current) {
      const currentIds = localSubtasks.map(s => s.id).sort().join(',')
      const newIds = subtasks.map(s => s.id).sort().join(',')
      
      if (currentIds !== newIds || lastSubtaskIdsRef.current !== newIds) {
        setLocalSubtasks(subtasks)
        lastSubtaskIdsRef.current = newIds
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subtasks])

  const handleDragStart = (e, subtaskId, index) => {
    e.stopPropagation()
    setDraggedSubtaskId(subtaskId)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', subtaskId.toString())
    // Make the dragged element semi-transparent
    if (e.target) {
      e.target.style.opacity = '0.5'
    }
  }

  const handleDragOver = (e, index) => {
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'move'
    setDragOverIndex(index)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    e.stopPropagation()
    // Don't clear dragOverIndex here - let drop handle it
  }

  const handleDrop = async (e, dropIndex) => {
    e.preventDefault()
    e.stopPropagation()
    
    let draggedId = draggedSubtaskId
    if (!draggedId) {
      try {
        const data = e.dataTransfer.getData('text/plain')
        // Handle both numeric IDs (from database) and string IDs (pending subtasks)
        const parsedId = parseInt(data)
        draggedId = isNaN(parsedId) ? data : parsedId
      } catch (err) {
        console.error('Failed to get dragged ID from dataTransfer:', err)
      }
    }
    
    if (!draggedId) {
      setDragOverIndex(null)
      setDraggedSubtaskId(null)
      return
    }
    
    const currentIndex = localSubtasks.findIndex(st => st.id === draggedId || st.id?.toString() === draggedId?.toString())
    if (currentIndex === -1 || currentIndex === dropIndex) {
      setDraggedSubtaskId(null)
      setDragOverIndex(null)
      return
    }
    
    const newSubtasks = [...localSubtasks]
    const [removed] = newSubtasks.splice(currentIndex, 1)
    newSubtasks.splice(dropIndex, 0, removed)
    
    isReorderingRef.current = true
    setLocalSubtasks(newSubtasks)
    
    if (onOrderChange) {
      onOrderChange(newSubtasks.map(st => st.id))
    }
    
    setTimeout(() => {
      isReorderingRef.current = false
    }, 100)
    
    setDraggedSubtaskId(null)
    setDragOverIndex(null)
  }

  const handleDragEnd = (e) => {
    e.preventDefault()
    // Reset opacity
    if (e.target) {
      e.target.style.opacity = '1'
    }
    setDraggedSubtaskId(null)
    setDragOverIndex(null)
  }

  return (
    <>
      <div 
        className="subtask-list-container mb-2"
        onDragOver={(e) => {
          e.preventDefault()
          e.stopPropagation()
        }}
      >
        {localSubtasks.map((subtask, idx) => (
          <div
            key={subtask.id}
            draggable={true}
            onDragStart={(e) => {
              // Allow dragging from anywhere on the item except buttons and inputs
              const target = e.target
              if (target.tagName === 'BUTTON' || target.tagName === 'INPUT' || target.closest('button') || target.closest('input')) {
                e.preventDefault()
                e.stopPropagation()
                return false
              }
              handleDragStart(e, subtask.id, idx)
            }}
            onDragOver={(e) => {
              e.preventDefault()
              e.stopPropagation()
              handleDragOver(e, idx)
            }}
            onDragLeave={(e) => {
              // Only clear if we're actually leaving the element
              const rect = e.currentTarget.getBoundingClientRect()
              const x = e.clientX
              const y = e.clientY
              if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
                handleDragLeave(e)
              }
            }}
            onDrop={(e) => handleDrop(e, idx)}
            onDragEnd={handleDragEnd}
            className={`subtask-item d-flex align-items-center gap-2 p-2 mb-2 ${subtask.status === 'Completed' || subtask.status === 3 ? 'subtask-completed' : 'subtask-active'} ${draggedSubtaskId === subtask.id || draggedSubtaskId?.toString() === subtask.id?.toString() ? 'dragging' : ''} ${dragOverIndex === idx ? 'drag-over' : ''}`}
          >
            <span 
              className="subtask-drag-handle" 
              style={{ cursor: 'grab', userSelect: 'none', fontSize: '1.1rem', color: '#6c757d' }} 
              title="Drag to reorder"
              onMouseDown={(e) => e.stopPropagation()}
            >
              ⋮⋮
            </span>
            {onToggleComplete && (
              <input
                type="checkbox"
                className="form-check-input"
                checked={subtask.isCompleted || subtask.status === 'Completed' || subtask.status === 3}
                onChange={async (e) => {
                  e.stopPropagation()
                  if (onToggleComplete) {
                    const isCurrentlyCompleted = subtask.isCompleted || subtask.status === 'Completed' || subtask.status === 3
                    const newIsCompleted = !isCurrentlyCompleted
                    const newStatus = newIsCompleted ? 3 : 0
                    
                    // Update local state immediately for instant UI feedback
                    setLocalSubtasks(prev => prev.map(st => 
                      st.id === subtask.id 
                        ? { ...st, isCompleted: newIsCompleted, status: newStatus }
                        : st
                    ))
                    // Then call the handler to update backend
                    try {
                      await onToggleComplete(subtask)
                    } catch (err) {
                      // Revert on error
                      setLocalSubtasks(prev => prev.map(st => 
                        st.id === subtask.id 
                          ? { ...st, isCompleted: subtask.isCompleted, status: subtask.status }
                          : st
                      ))
                    }
                  }
                }}
                style={{ minWidth: '1.1rem', minHeight: '1.1rem', margin: 0, cursor: 'pointer' }}
                onDragStart={(e) => e.preventDefault()}
                onMouseDown={(e) => e.stopPropagation()}
              />
            )}
            <span 
              className={`subtask-title flex-grow-1 ${subtask.isCompleted || subtask.status === 'Completed' || subtask.status === 3 ? 'text-decoration-line-through text-muted' : ''}`}
              onDragStart={(e) => e.preventDefault()}
            >
              {subtask.title}
            </span>
            {onEditSubtask && (
              <button
                type="button"
                className="btn btn-sm btn-outline-dark subtask-edit"
                onClick={(e) => {
                  e.stopPropagation()
                  e.preventDefault()
                  if (onEditSubtask) {
                    onEditSubtask(subtask)
                  }
                }}
                onDragStart={(e) => e.preventDefault()}
                onMouseDown={(e) => e.stopPropagation()}
                title="Edit subtask"
                style={{ border: 'none', background: 'transparent', padding: '0.25rem', minWidth: 'auto' }}
              >
                ✏️
              </button>
            )}
            {onDeleteSubtask && (
              <button
                type="button"
                className="btn btn-sm btn-outline-danger subtask-delete"
                onClick={async (e) => {
                  e.stopPropagation()
                  e.preventDefault()
                  const confirmMessage = parentTaskId 
                    ? `Delete subtask "${subtask.title}"?`
                    : `Remove subtask "${subtask.title}"?`
                  if (await confirm(confirmMessage, 'Delete Subtask')) {
                    try {
                      if (onDeleteSubtask) {
                        await onDeleteSubtask(parentTaskId, subtask.id)
                      }
                    } catch (err) {
                      await alert(err.message || err.response?.data?.message || 'Failed to delete subtask', 'Error')
                    }
                  }
                }}
                onDragStart={(e) => e.preventDefault()}
                onMouseDown={(e) => e.stopPropagation()}
                title={parentTaskId ? "Delete subtask" : "Remove subtask"}
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>
      <style>{`
        .subtask-list-container {
          min-height: 2rem;
        }
        .subtask-item {
          min-height: 2.75rem;
          border-radius: 0.5rem;
          transition: all 0.2s ease;
          cursor: move;
          position: relative;
        }
        .subtask-item:hover {
          transform: translateY(-1px);
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .subtask-item.dragging {
          opacity: 0.5;
          transform: scale(0.98);
        }
        .subtask-item.drag-over {
          border-top: 3px solid #495057 !important;
          margin-top: 2px;
        }
        [data-theme="dark"] .subtask-item.drag-over {
          border-top: 3px solid #adb5bd !important;
        }
        .subtask-active {
          background-color: #f8f9fa;
          border: 1px solid #dee2e6;
        }
        .subtask-completed {
          background-color: #e9ecef;
          border: 1px solid #dee2e6;
        }
        .subtask-title {
          font-size: 0.95rem;
          font-weight: 500;
        }
        .subtask-edit {
          padding: 0.25rem;
          font-size: 0.875rem;
          line-height: 1;
          min-width: auto;
          border: none !important;
          background: transparent !important;
          color: #495057;
          opacity: 0.6;
          transition: all 0.2s;
        }
        .subtask-edit:hover {
          opacity: 1;
          color: #212529;
        }
        [data-theme="dark"] .subtask-edit {
          color: #adb5bd;
          opacity: 0.7;
        }
        [data-theme="dark"] .subtask-edit:hover {
          color: #fff;
          opacity: 1;
        }
        .subtask-delete {
          padding: 0.2rem 0.5rem;
          font-size: 0.875rem;
          line-height: 1.2;
          min-width: 2rem;
        }
        [data-theme="dark"] .subtask-active {
          background-color: rgba(255, 255, 255, 0.08);
          border-color: #6c757d;
          color: #fff;
        }
        [data-theme="dark"] .subtask-completed {
          background-color: rgba(255, 255, 255, 0.05);
          border-color: #495057;
          color: #adb5bd;
        }
        [data-theme="dark"] .subtask-item:hover {
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        }
        [data-theme="dark"] .subtask-drag-handle {
          color: #adb5bd !important;
        }
        .subtask-item:active {
          cursor: grabbing;
        }
        .subtask-drag-handle:active {
          cursor: grabbing;
        }
      `}</style>
    </>
  )
}

function TaskModal({ show, onClose, onSubmit, task, isEditing, openedFromNaturalLanguage = false, submitting = false, onSaveAsTemplate, allTasks = [], onCreateSubtask, onDeleteSubtask, onEditSubtask, onReorderSubtasks, onToggleCompleteSubtask }) {
  const { settings } = useSettings()
  const { dialog, alert, confirm } = useDialog()
  const [pendingSubtasks, setPendingSubtasks] = useState([])
  const [showHistory, setShowHistory] = useState(false)
  const [showDependencies, setShowDependencies] = useState(false)
  
  const getDateTimeString = (dateValue) => {
    if (!dateValue) return ''
    if (typeof dateValue === 'string') {
      // If it's already in datetime-local format, return it directly
      if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(dateValue)) {
        return dateValue.slice(0, 16) // YYYY-MM-DDTHH:mm
      }
      // If it's date-only format, add default time (end of day: 23:59)
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
        return `${dateValue}T23:59`
      }
    }
    // Otherwise, parse and format as datetime-local
    try {
    const date = new Date(dateValue)
      if (isNaN(date.getTime())) return ''
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day}T${hours}:${minutes}`
    } catch {
      return ''
    }
  }
  
  const getDateString = (dateValue) => {
    if (!dateValue) return ''
    if (typeof dateValue === 'string') {
      // If it's already in YYYY-MM-DD format, return it directly
      if (/^\d{4}-\d{2}-\d{2}/.test(dateValue)) {
        return dateValue.split('T')[0]
      }
    }
    // Otherwise, parse and extract date parts without timezone conversion
    try {
    const date = new Date(dateValue)
      if (isNaN(date.getTime())) return ''
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
    } catch {
      return ''
    }
  }
  
  // Helper to convert status to string format
  const getStatusString = (status) => {
    if (!status) return 'Active'
    if (typeof status === 'string') {
      // Handle statusName format (e.g., 'InProgress' -> 'InProgress')
      if (status === 'InProgress') return 'InProgress'
      if (status === 'OnHold') return 'OnHold'
      return status
    }
    // Convert number to string
    const statusMap = { 0: 'Active', 1: 'InProgress', 2: 'OnHold', 3: 'Completed', 4: 'Cancelled' }
    return statusMap[status] || 'Active'
  }
  
  const [tagInput, setTagInput] = useState('')
  const [pendingSubtaskOrder, setPendingSubtaskOrder] = useState(null) // Store pending reorder until Update is clicked
  const [showTagSuggestions, setShowTagSuggestions] = useState(false)
  const [allTags, setAllTags] = useState({})
  const [suggestedTagsFromSimilar, setSuggestedTagsFromSimilar] = useState([])

  useEffect(() => {
    const fetchTags = async () => {
      try {
        const tags = await tagService.getAll()
        setAllTags(tags || {})
      } catch (err) {
        console.error('Failed to fetch tags:', err)
      }
    }
    if (show) {
      fetchTags()
    }
  }, [show])

  const getTagSuggestions = () => {
    if (!tagInput.trim()) return []
    const input = tagInput.trim().toLowerCase()
    return Object.keys(allTags)
      .filter(tag => tag.toLowerCase().includes(input) && !formData.tags.includes(tag))
      .sort()
  }

  const [formData, setFormData] = useState({
    title: task?.title ?? '',
    description: task?.description ?? '',
    dueDate: getDateTimeString(task?.dueDate) ?? '',
    priority: task?.priority ?? settings.defaultPriority,
    tags: task?.tags ? (Array.isArray(task.tags) ? task.tags : Object.keys(task.tags)) : [],
    file: null,
    fileUrl: task?.fileUrl ?? null,
    fileName: task?.fileName ?? null,
    recurrenceType: task?.recurrenceType ?? settings.defaultRecurrenceType,
    recurrenceEndDate: getDateString(task?.recurrenceEndDate) ?? '',
    notes: task?.notes ?? '',
    estimatedTimeMinutes: task?.estimatedTimeMinutes ?? '',
    status: getStatusString(task?.status || task?.statusName || (task?.isCompleted ? 'Completed' : 'Active')) ?? 'Active',
    dependsOnTaskIds: task?.dependsOnTaskIds ?? [],
    subtaskTitle: ''
  })

  const isBlocked = isEditing && task?.canStart === false && task?.dependsOnTaskIds && task.dependsOnTaskIds.length > 0

  useEffect(() => {
    if (!show) return
    const text = [formData.title, formData.description].filter(Boolean).join(' ').trim()
    if (!text) {
      setSuggestedTagsFromSimilar([])
      return
    }
    const t = setTimeout(async () => {
      try {
        const list = await taskService.getSuggestedTags(text)
        setSuggestedTagsFromSimilar(Array.isArray(list) ? list : [])
      } catch {
        setSuggestedTagsFromSimilar([])
      }
    }, 300)
    return () => clearTimeout(t)
  }, [show, formData.title, formData.description])

  useEffect(() => {
    if (task) {
      setTagInput('')
      setPendingSubtaskOrder(null) // Reset pending order when task changes
      
      // If editing existing task (has id), clear pending subtasks
      // If using template (no id), initialize with template subtasks
      if (task.id) {
        setPendingSubtasks([]) // Clear pending subtasks when editing existing task
      } else {
        // Initialize with template subtasks if any (when creating from template)
        // Add temporary IDs to template subtasks for drag-and-drop to work
        const addIdsToSubtasks = (subtasks) => {
          if (!subtasks || subtasks.length === 0) return []
          return subtasks.map((st, idx) => ({
            ...st,
            id: st.id || `template-${Date.now()}-${idx}-${Math.random()}`,
            status: st.status || 0,
            subtasks: st.subtasks ? addIdsToSubtasks(st.subtasks) : []
          }))
        }
        setPendingSubtasks(addIdsToSubtasks(task.subtasks || []))
      }
      
      setShowDependencies(false) // Reset dependencies view
      setFormData({
        title: task.title ?? '',
        description: task.description ?? '',
        dueDate: getDateTimeString(task.dueDate) ?? '',
        priority: task.priority ?? settings.defaultPriority,
        tags: task.tags ? (Array.isArray(task.tags) ? task.tags : Object.keys(task.tags)) : [],
        file: null,
        fileUrl: task.fileUrl ?? null,
        fileName: task.fileName ?? null,
        recurrenceType: task.recurrenceType ?? settings.defaultRecurrenceType,
        recurrenceEndDate: getDateString(task.recurrenceEndDate) ?? '',
        notes: task.notes ?? '',
        estimatedTimeMinutes: task.estimatedTimeMinutes ?? '',
        status: getStatusString(task.status || task.statusName || (task.isCompleted ? 'Completed' : 'Active')) ?? 'Active',
        dependsOnTaskIds: task.dependsOnTaskIds ?? [],
        subtaskTitle: ''
      })
    } else {
      setTagInput('')
      setPendingSubtasks([]) // Clear when no task
      setShowDependencies(false) // Reset dependencies view
      setFormData({ 
        title: '', 
        description: '', 
        dueDate: '', 
        priority: settings.defaultPriority, 
        tags: [], 
        file: null, 
        fileUrl: null, 
        fileName: null, 
        recurrenceType: settings.defaultRecurrenceType, 
        recurrenceEndDate: '', 
        notes: '',
        estimatedTimeMinutes: '',
        status: 'Active',
        dependsOnTaskIds: [],
        subtaskTitle: ''
      })
    }
  }, [task, show, settings.defaultPriority, settings.defaultRecurrenceType])

  const addTag = (tagText) => {
    const newTag = tagText.trim()
    if (newTag && !formData.tags.includes(newTag)) {
      setFormData({ ...formData, tags: [...formData.tags, newTag] })
      return true
    }
    return false
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.title.trim()) {
      return
    }
    
    // Save pending subtask order if it exists (from drag-and-drop)
    if (pendingSubtaskOrder && task && onReorderSubtasks) {
      try {
        await onReorderSubtasks(task.id, pendingSubtaskOrder)
        setPendingSubtaskOrder(null) // Clear after saving
      } catch (err) {
        console.error('Failed to save subtask order:', err)
        // Continue with form submission even if reorder fails
      }
    }
    
    // Auto-add any uncommitted tag before submitting
    let finalFormData = { ...formData }
    if (tagInput.trim()) {
      const newTag = tagInput.trim()
      if (!finalFormData.tags.includes(newTag)) {
        finalFormData = { ...finalFormData, tags: [...finalFormData.tags, newTag] }
      }
      setTagInput('')
    }
    // Include pending subtasks when creating new task
    if (!isEditing && pendingSubtasks.length > 0) {
      finalFormData.pendingSubtasks = pendingSubtasks
    }
    onSubmit(finalFormData)
  }

  if (!show) return null

  const suggestedTagsToShow = suggestedTagsFromSimilar.filter(t => !formData.tags.includes(t.name))

  return (
    <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable">
        <div className="modal-content">
          <div className="modal-header">
            <div className="d-flex align-items-center gap-2">
              {isEditing && task?.parentTaskId && onEditSubtask && (
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  onClick={async (e) => {
                    e.preventDefault()
                    try {
                      const parentTask = await taskService.getById(task.parentTaskId)
                      onEditSubtask(parentTask)
                    } catch (err) {
                      console.error('Failed to fetch parent task:', err)
                    }
                  }}
                  title="Back to parent task"
                >
                  ←
                </button>
              )}
              <h5 className="modal-title mb-0 d-flex align-items-center gap-2 flex-wrap">
                {isEditing ? (task?.parentTaskId ? 'Edit Subtask' : 'Edit Task') : 'Create Task'}
                {!isEditing && openedFromNaturalLanguage && (
                  <span className="badge bg-info text-dark" style={{ fontSize: '0.7rem', fontWeight: 'normal' }} title="We prefilled the form from your text">From your text</span>
                )}
              </h5>
            </div>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          <form onSubmit={handleSubmit} onDragOver={(e) => e.preventDefault()}>
            <div className="modal-body">
              <div className="mb-3">
                <label className="form-label">Title</label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Description</label>
                <textarea
                  className="form-control"
                  rows="3"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              {((isEditing && task && onCreateSubtask) || (!isEditing)) && (
                <div className="mb-3">
                  <label className="form-label">Subtasks</label>
                  <div className="input-group mb-2">
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Type subtask and press Enter"
                      value={formData.subtaskTitle}
                      onChange={(e) => setFormData({ ...formData, subtaskTitle: e.target.value })}
                      onKeyDown={async (e) => {
                        if (e.key === 'Enter' && formData.subtaskTitle.trim()) {
                          e.preventDefault()
                          if (isEditing && task && onCreateSubtask) {
                            try {
                              await onCreateSubtask(task.id, { title: formData.subtaskTitle.trim() })
                              setFormData({ ...formData, subtaskTitle: '' })
                            } catch (err) {
                              await alert(err.message || err.response?.data?.message || 'Failed to create subtask', 'Error')
                            }
                          } else {
                            // Add to pending subtasks when creating new task
                            const newSubtask = {
                              id: `pending-${Date.now()}-${Math.random()}`,
                              title: formData.subtaskTitle.trim(),
                              description: null,
                              priority: 1,
                              status: 0,
                              subtasks: []
                            }
                            setPendingSubtasks([...pendingSubtasks, newSubtask])
                            setFormData({ ...formData, subtaskTitle: '' })
                          }
                        }
                      }}
                      onBlur={async () => {
                        // Auto-add subtask when user clicks away (blur)
                        if (formData.subtaskTitle.trim()) {
                          if (isEditing && task && onCreateSubtask) {
                            try {
                              await onCreateSubtask(task.id, { title: formData.subtaskTitle.trim() })
                              setFormData({ ...formData, subtaskTitle: '' })
                            } catch (err) {
                              console.error('Failed to create subtask:', err)
                            }
                          } else {
                            // Add to pending subtasks when creating new task
                            const newSubtask = {
                              id: `pending-${Date.now()}-${Math.random()}`,
                              title: formData.subtaskTitle.trim(),
                              description: null,
                              priority: 1,
                              status: 0,
                              subtasks: []
                            }
                            setPendingSubtasks([...pendingSubtasks, newSubtask])
                            setFormData({ ...formData, subtaskTitle: '' })
                          }
                        }
                      }}
                    />
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={async () => {
                        if (formData.subtaskTitle.trim()) {
                          if (isEditing && task && onCreateSubtask) {
                            try {
                              await onCreateSubtask(task.id, { title: formData.subtaskTitle.trim() })
                              setFormData({ ...formData, subtaskTitle: '' })
                            } catch (err) {
                              await alert(err.message || err.response?.data?.message || 'Failed to create subtask', 'Error')
                            }
                          } else {
                            // Add to pending subtasks when creating new task
                            const newSubtask = {
                              id: `pending-${Date.now()}-${Math.random()}`,
                              title: formData.subtaskTitle.trim(),
                              description: null,
                              priority: 1,
                              status: 0,
                              subtasks: []
                            }
                            setPendingSubtasks([...pendingSubtasks, newSubtask])
                            setFormData({ ...formData, subtaskTitle: '' })
                          }
                        }
                      }}
                    >
                      Add
                    </button>
                  </div>
                  {isEditing && task && task.subtasks && task.subtasks.length > 0 && (
                    <SubtaskList 
                      subtasks={task.subtasks} 
                      onDeleteSubtask={onDeleteSubtask}
                      parentTaskId={task.id}
                      onReorderSubtasks={onReorderSubtasks}
                      onOrderChange={(subtaskIds) => {
                        setPendingSubtaskOrder(subtaskIds)
                      }}
                      onToggleComplete={onToggleCompleteSubtask}
                      onEditSubtask={onEditSubtask}
                    />
                  )}
                  {!isEditing && pendingSubtasks.length > 0 && (
                    <SubtaskList 
                      subtasks={pendingSubtasks} 
                      onDeleteSubtask={(parentId, subtaskId) => {
                        setPendingSubtasks(prev => prev.filter(st => st.id !== subtaskId || st.id?.toString() !== subtaskId?.toString()))
                      }}
                      parentTaskId={null}
                      onReorderSubtasks={null}
                      onOrderChange={(orderedIds) => {
                        // Reorder pending subtasks based on the new order using functional update
                        setPendingSubtasks(prev => {
                          const orderedSubtasks = orderedIds
                            .map(id => prev.find(st => st.id === id || st.id?.toString() === id?.toString()))
                            .filter(Boolean)
                          // Include any subtasks that weren't in the ordered list (shouldn't happen, but safety check)
                          const remainingIds = new Set(orderedIds.map(id => id?.toString()))
                          const missing = prev.filter(st => !remainingIds.has(st.id?.toString()))
                          return [...orderedSubtasks, ...missing]
                        })
                      }}
                      onToggleComplete={null}
                      onEditSubtask={null}
                    />
                  )}
                </div>
              )}
              <div className="mb-3">
                <label className="form-label">Due Date & Time</label>
                <input
                  type="datetime-local"
                  className="form-control"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Status</label>
                <select
                  className="form-select"
                  value={isBlocked ? 'Blocked' : formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  disabled={submitting || isBlocked}
                >
                  <option value="Active">Active</option>
                  <option value="InProgress">In Progress</option>
                  <option value="OnHold">On Hold</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                  <option value="Blocked">Blocked</option>
                </select>
                {isBlocked && (
                  <small className="text-muted">Blocked — complete dependencies first to change status.</small>
                )}
              </div>
              <div className="mb-3">
                <label className="form-label">Priority</label>
                <select
                  className="form-select"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                >
                  <option value={0}>Low</option>
                  <option value={1}>Medium</option>
                  <option value={2}>High</option>
                </select>
              </div>
              <div className="mb-3">
                <label className="form-label">Tags</label>
                <div className="d-flex flex-wrap gap-2 mb-2">
                  {formData.tags.map((tag, idx) => {
                    const tagColor = task?.tags?.[tag] || allTags[tag] || '#6c757d'
                    return (
                      <span 
                        key={idx} 
                        className="badge d-flex align-items-center gap-1"
                        style={{ backgroundColor: tagColor, color: '#fff', border: 'none' }}
                      >
                        {tag}
                        <button
                          type="button"
                          className="btn-close btn-close-white"
                          style={{ fontSize: '0.7rem' }}
                          onClick={() => {
                            const newTags = formData.tags.filter((_, i) => i !== idx)
                            setFormData({ ...formData, tags: newTags })
                          }}
                        />
                      </span>
                    )
                  })}
                </div>
                <div className="position-relative">
                  <div className="input-group">
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Type tag and press Enter"
                      value={tagInput}
                      onChange={(e) => {
                        setTagInput(e.target.value)
                        setShowTagSuggestions(true)
                      }}
                      onFocus={() => setShowTagSuggestions(true)}
                      onKeyDown={(e) => {
                        const suggestions = getTagSuggestions()
                        if (e.key === 'Enter' && tagInput.trim()) {
                          e.preventDefault()
                          if (suggestions.length > 0) {
                            addTag(suggestions[0])
                            setTagInput('')
                            setShowTagSuggestions(false)
                          } else if (addTag(tagInput)) {
                            setTagInput('')
                            setShowTagSuggestions(false)
                          }
                        } else if (e.key === 'Escape') {
                          setShowTagSuggestions(false)
                        }
                      }}
                      onBlur={() => {
                        if (tagInput.trim()) {
                          const suggestions = getTagSuggestions()
                          if (suggestions.length > 0) {
                            addTag(suggestions[0])
                            setTagInput('')
                          } else if (addTag(tagInput)) {
                            setTagInput('')
                          }
                        }
                        setTimeout(() => setShowTagSuggestions(false), 200)
                      }}
                    />
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={(e) => {
                        e.preventDefault()
                        if (tagInput.trim()) {
                          if (addTag(tagInput)) {
                            setTagInput('')
                            setShowTagSuggestions(false)
                          }
                        }
                      }}
                    >
                      Add
                    </button>
                  </div>
                  {showTagSuggestions && getTagSuggestions().length > 0 && (
                    <div className="position-absolute top-100 start-0 w-100 mt-1 border rounded shadow-sm" style={{ zIndex: 1000, maxHeight: '200px', overflowY: 'auto', backgroundColor: 'var(--bs-body-bg)', borderColor: 'var(--bs-border-color)' }}>
                      {getTagSuggestions().map((tag, idx) => {
                        const tagColor = allTags[tag] || '#6c757d'
                        return (
                          <button
                            key={idx}
                            type="button"
                            className="btn btn-sm w-100 text-start border-0 rounded-0"
                            style={{ backgroundColor: tagColor, color: '#fff' }}
                            onMouseDown={(e) => {
                              e.preventDefault()
                              addTag(tag)
                              setTagInput('')
                              setShowTagSuggestions(false)
                            }}
                          >
                            {tag}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
                {suggestedTagsToShow.length > 0 && (
                  <div className="mt-2">
                    <span className="text-muted small me-2">From similar tasks:</span>
                    {suggestedTagsToShow.map((t, idx) => (
                        <button
                          key={idx}
                          type="button"
                          className="btn btn-sm me-1 mb-1 border"
                          style={{ backgroundColor: t.color || allTags[t.name] || '#6c757d', color: '#fff' }}
                          onClick={() => addTag(t.name)}
                        >
                          {t.name}
                        </button>
                      ))}
                  </div>
                )}
                </div>
              <div className="mb-3">
                <label className="form-label">Attachment</label>
                {formData.fileUrl && (
                  <div className="mb-2">
                    <a href={formData.fileUrl} target="_blank" rel="noopener noreferrer" className="text-decoration-none">
                      📎 {formData.fileName || 'View attachment'}
                    </a>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-danger ms-2"
                      onClick={() => setFormData({ ...formData, fileUrl: null, fileName: null, file: null })}
                    >
                      Remove
                    </button>
                  </div>
                )}
                <input
                  type="file"
                  className="form-control"
                  accept="image/*,.pdf,.doc,.docx"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      const reader = new FileReader()
                      reader.onloadend = () => {
                        setFormData({ ...formData, file, fileUrl: reader.result, fileName: file.name })
                      }
                      reader.readAsDataURL(file)
                    }
                  }}
                />
                <small className="text-muted">Max 5MB. Images, PDF, Word docs</small>
              </div>
              <div className="mb-3">
                <label className="form-label">Repeat</label>
                <select
                  className="form-select"
                  value={formData.recurrenceType}
                  onChange={(e) => setFormData({ ...formData, recurrenceType: parseInt(e.target.value), recurrenceEndDate: e.target.value === '0' ? '' : formData.recurrenceEndDate })}
                >
                  <option value={0}>None</option>
                  <option value={1}>Daily</option>
                  <option value={2}>Weekly</option>
                  <option value={3}>Monthly</option>
                </select>
              </div>
              {formData.recurrenceType > 0 && (
                <div className="mb-3">
                  <label className="form-label">Repeat Until</label>
                  <input
                    type="date"
                    className="form-control"
                    value={formData.recurrenceEndDate}
                    onChange={(e) => setFormData({ ...formData, recurrenceEndDate: e.target.value })}
                    min={formData.dueDate ? formData.dueDate.split('T')[0] : new Date().toISOString().split('T')[0]}
                  />
                  <small className="text-muted">Leave empty to repeat indefinitely</small>
                </div>
              )}
              <div className="mb-3">
                <label className="form-label">Notes</label>
                <textarea
                  className="form-control"
                  rows="3"
                  placeholder="Additional notes or reminders..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
                <small className="text-muted">Optional notes for this task</small>
              </div>
              <div className="mb-3">
                <label className="form-label">Estimated Time (minutes)</label>
                <input
                  type="number"
                  className="form-control"
                  placeholder="e.g., 30, 60, 120"
                  min="0"
                  value={formData.estimatedTimeMinutes ?? ''}
                  onChange={(e) => setFormData({ ...formData, estimatedTimeMinutes: e.target.value ? parseInt(e.target.value) : '' })}
                  onKeyDown={(e) => {
                    if (e.key === 'e' || e.key === 'E' || e.key === '+' || e.key === '-') {
                      e.preventDefault()
                    }
                  }}
                />
                <small className="text-muted">Optional estimated time to complete this task</small>
              </div>
              {!task?.parentTaskId && (
                <div className="mb-3">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <label className="form-label mb-0">Depends On</label>
                    <div className="d-flex align-items-center gap-2">
                      {!showDependencies && formData.dependsOnTaskIds.length > 0 && (
                        <small className="text-muted mb-0">
                          {formData.dependsOnTaskIds.length} task{formData.dependsOnTaskIds.length !== 1 ? 's' : ''} selected
                        </small>
                      )}
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-primary"
                        onClick={() => setShowDependencies(!showDependencies)}
                      >
                        {showDependencies ? '▼ Hide' : '▶ Show'}
                      </button>
                    </div>
                  </div>
                  {showDependencies && (
                    <>
                      <div className="border rounded p-2" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                        {allTasks
                          .filter(t => !t.parentTaskId && t.id !== task?.id)
                          .map(t => (
                            <div key={t.id} className="form-check">
                              <input
                                type="checkbox"
                                className="form-check-input"
                                id={`depends-${t.id}`}
                                checked={formData.dependsOnTaskIds.includes(t.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setFormData({ ...formData, dependsOnTaskIds: [...formData.dependsOnTaskIds, t.id] })
                                  } else {
                                    setFormData({ ...formData, dependsOnTaskIds: formData.dependsOnTaskIds.filter(id => id !== t.id) })
                                  }
                                }}
                              />
                              <label className="form-check-label" htmlFor={`depends-${t.id}`} style={{ cursor: 'pointer', width: '100%' }}>
                                {t.title}
                              </label>
                            </div>
                          ))}
                        {allTasks.filter(t => !t.parentTaskId && t.id !== task?.id).length === 0 && (
                          <small className="text-muted">No other tasks available</small>
                        )}
                      </div>
                      <small className="text-muted">Select tasks this task depends on. Only parent tasks can have dependencies.</small>
                    </>
                  )}
                </div>
              )}
            </div>
            <div className="modal-footer d-flex gap-2">
              <button type="button" className="btn btn-secondary flex-fill" onClick={onClose} disabled={submitting}>
                Cancel
              </button>
              {isEditing && task && (
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => setShowHistory(true)}
                  title="Task history"
                >
                  📜
                </button>
              )}
              {onSaveAsTemplate && formData.title.trim() && !isEditing && (
                <button
                  type="button"
                  className="btn btn-outline-info"
                  onClick={() => onSaveAsTemplate(formData, pendingSubtasks)}
                  disabled={submitting}
                  title="Save as template"
                >
                  📋
                </button>
              )}
              <button type="submit" className="btn btn-primary flex-fill" disabled={submitting || !formData.title.trim()}>
                {submitting ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    <span className="d-none d-sm-inline">{isEditing ? 'Updating...' : 'Creating...'}</span>
                    <span className="d-sm-none">{isEditing ? 'Updating' : 'Creating'}</span>
                  </>
                ) : (
                  isEditing ? 'Update' : 'Create'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      <Dialog {...dialog} />
      {showHistory && task && (
        <TaskHistory taskId={task.id} onClose={() => setShowHistory(false)} />
      )}
    </div>
  )
}

export default TaskModal

