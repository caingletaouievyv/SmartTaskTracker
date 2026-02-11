import { useState, useEffect, useRef, useMemo } from 'react'
import { useTasks } from '../hooks/useTasks'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'
import { useNotifications } from '../hooks/useNotifications'
import { useSettings } from '../hooks/useSettings'
import { useDialog } from '../hooks/useDialog'
import Navbar from '../components/Navbar'
import TaskCard from '../components/TaskCard'
import TaskModal from '../components/TaskModal'
import Dialog from '../components/Dialog'
import { taskTemplateService } from '../services/taskTemplateService'
import { analyticsService } from '../services/analyticsService'
import { reminderService } from '../services/reminderService'
import { taskService } from '../services/taskService'
import { settingsService } from '../services/settingsService'
import { isServerWakingError } from '../services/api'

// Bulk Actions Bar Component
function BulkActionsBar({ selectedCount, selectedTasks, tasks, onBulkDelete, onBulkStatusChange, onBulkArchive, onBulkUnarchive, onClear }) {
  const [showStatusDropdown, setShowStatusDropdown] = useState(false)
  
  // Check if all selected tasks are completed (for bulk archive)
  const allSelectedCompleted = selectedTasks.size > 0 && 
    Array.from(selectedTasks).every(id => {
      const task = tasks.find(t => t.id === id)
      return task?.isCompleted
    })
  
  // Check if all selected tasks are archived (for bulk unarchive)
  const allSelectedArchived = selectedTasks.size > 0 && 
    Array.from(selectedTasks).every(id => {
      const task = tasks.find(t => t.id === id)
      return task?.isArchived
    })
  
  const statusOptions = [
    { value: 'Active', label: 'Active' },
    { value: 'InProgress', label: 'In Progress' },
    { value: 'OnHold', label: 'On Hold' },
    { value: 'Completed', label: 'Completed' },
    { value: 'Cancelled', label: 'Cancelled' }
  ]

  return (
    <div className="alert alert-info d-flex justify-content-between align-items-center mb-3">
      <span className="fw-semibold">{selectedCount} task(s) selected</span>
      <div className="d-flex gap-2 flex-wrap">
        <button className="btn btn-sm btn-danger" onClick={onBulkDelete}>
          🗑️ Delete Selected
        </button>
        {allSelectedCompleted && !allSelectedArchived && (
        <button className="btn btn-sm btn-primary" onClick={onBulkArchive}>
            📦 Archive Selected
          </button>
        )}
        {allSelectedArchived && (
          <button className="btn btn-sm btn-info" onClick={onBulkUnarchive}>
            📤 Unarchive Selected
          </button>
        )}
        <div className="position-relative">
          <button 
            className="btn btn-sm btn-primary d-flex align-items-center gap-1"
            onClick={() => setShowStatusDropdown(!showStatusDropdown)}
            title="Change status of selected tasks"
            style={{ 
              minWidth: '140px',
              justifyContent: 'space-between'
            }}
          >
            <span>📋 Change Status</span>
            <span style={{ fontSize: '0.7rem', opacity: 0.8 }}>
              {showStatusDropdown ? '▲' : '▼'}
            </span>
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
                  zIndex: 999
                }}
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
                  borderColor: 'var(--bs-border-color)'
                }}
              >
                {statusOptions.map(option => (
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
                      transition: 'background-color 0.15s ease'
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
        <button className="btn btn-sm btn-outline-primary" onClick={onClear}>
          Clear
        </button>
      </div>
    </div>
  )
}

const tagsToArray = (tags) => {
  if (!tags) return []
  return Array.isArray(tags) ? tags : Object.keys(tags)
}

function Tasks() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [sortBy, setSortBy] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingTask, setEditingTask] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [templates, setTemplates] = useState([])
  const [showTemplates, setShowTemplates] = useState(false)
  const [showTemplateNameModal, setShowTemplateNameModal] = useState(false)
  const [templateNameInput, setTemplateNameInput] = useState('')
  const [formDataToSave, setFormDataToSave] = useState(null)
  const [subtasksToSave, setSubtasksToSave] = useState([])
  const [analytics, setAnalytics] = useState(null)
  const [showAnalytics, setShowAnalytics] = useState(false)
  const [reminders, setReminders] = useState(null)
  const [showReminders, setShowReminders] = useState(false)
  const [selectedTasks, setSelectedTasks] = useState(new Set())
  const isBulkOperationRef = useRef(false)
  const [quickFilter, setQuickFilter] = useState('')
  const [showArchived, setShowArchived] = useState(false)
  const [filterPresets, setFilterPresets] = useState([])
  const [selectedPresetId, setSelectedPresetId] = useState('')
  const [selectedTags, setSelectedTags] = useState([])
  const searchInputRef = useRef(null)
  const cardRefs = useRef({})
  const editFromModalRef = useRef(false) // true when subtask was opened from inside TaskModal
  const [highlightedTaskId, setHighlightedTaskId] = useState(null)
  const { settings, loading: settingsLoading } = useSettings()

  const scrollToTaskThenEdit = (taskOrId) => {
    const id = typeof taskOrId === 'object' && taskOrId != null ? taskOrId.id : taskOrId
    if (id == null) return
    setHighlightedTaskId(id)
    const task = typeof taskOrId === 'object' && taskOrId != null ? taskOrId : allTasks.find((t) => t.id === id) || { id }
    setTimeout(() => {
      setHighlightedTaskId(null)
      handleEdit(task)
    }, 450)
  }
  useEffect(() => {
    if (highlightedTaskId && cardRefs.current[highlightedTaskId]) {
      cardRefs.current[highlightedTaskId].scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [highlightedTaskId])
  const { dialog, alert, confirm, prompt } = useDialog()
  
  useEffect(() => {
    if (settingsLoading) return
    if (Array.isArray(settings.filterPresets)) {
      setFilterPresets(settings.filterPresets)
    }
  }, [settingsLoading, settings.filterPresets])

  useEffect(() => {
    if (settingsLoading) return
    if (sortBy) return
    if (settings.rememberSortBy && settings.lastSortBy) {
      setSortBy(settings.lastSortBy)
      return
    }
    if (!settings.rememberSortBy && settings.defaultSortBy) {
      setSortBy(settings.defaultSortBy)
    }
  }, [settingsLoading, settings.rememberSortBy, settings.lastSortBy, settings.defaultSortBy, sortBy])
  
  useEffect(() => {
    const saveSortBy = async () => {
      if (settings.rememberSortBy && sortBy) {
        try {
          const currentSettings = await settingsService.get()
          await settingsService.update({
            ...currentSettings,
            lastSortBy: sortBy
          })
        } catch (err) {
          console.error('Failed to save sort preference:', err)
        }
      }
    }
    saveSortBy()
  }, [sortBy, settings.rememberSortBy])
  
  const effectiveSortBy = sortBy || (settings.rememberSortBy && settings.lastSortBy) || settings.defaultSortBy || 'date'
  
  // Calculate backend filter params from quickFilter (memoized to prevent infinite loop)
  const dueDate = quickFilter === 'today' ? 'today' 
    : quickFilter === 'week' ? 'week' 
    : null
  
  const priority = quickFilter === 'high' ? 2 
    : quickFilter.startsWith('priority-') ? parseInt(quickFilter.split('-')[1])
    : null
  
  const tags = selectedTags.length > 0 ? selectedTags.join(',') : null
  
  const isTaskBlocked = (t) => t?.canStart === false && t?.dependsOnTaskIds && t.dependsOnTaskIds.length > 0

  // When showArchived is true, we want ONLY archived tasks (not mixed)
  const includeArchived = showArchived
  const { tasks: fetchedTasks, loading, createTask, updateTask, deleteTask, bulkDeleteTasks, bulkCompleteTasks, archiveTask, unarchiveTask, createSubtask, refreshTasks } = useTasks(search, status, effectiveSortBy, includeArchived, dueDate, priority, tags)
  
  // Filter: show ONLY archived when button active, ONLY active when button inactive
  // Use useMemo to prevent infinite loop from array reference changing
  const allTasks = useMemo(() => {
    const base = showArchived
      ? fetchedTasks.filter(task => task.isArchived)
      : fetchedTasks.filter(task => !task.isArchived)

    // Treat "Blocked" as a separate effective state in UI:
    // when filtering "Active", exclude blocked tasks.
    if (status === 'active') {
      return base.filter(t => !isTaskBlocked(t))
    }

    return base
  }, [fetchedTasks, showArchived, status])
  
  const [draggedTaskId, setDraggedTaskId] = useState(null)
  const [dragOverIndex, setDragOverIndex] = useState(null)

  const tasks = allTasks
  
  // Only apply drag/drop ordering when explicitly selected
  const sortedTasks = useMemo(() => {
    return effectiveSortBy === 'custom' && tasks.some(t => t.customOrder != null)
      ? [...tasks].sort((a, b) => (a.customOrder ?? 999999) - (b.customOrder ?? 999999))
      : tasks
  }, [tasks, effectiveSortBy])

  const handleCreate = () => {
    setEditingTask(null)
    setShowModal(true)
  }

  useKeyboardShortcuts({
    [settings.keyboardShortcuts?.newTask || 'n']: handleCreate,
    [settings.keyboardShortcuts?.focusSearch || 's']: () => searchInputRef.current?.focus(),
    [settings.keyboardShortcuts?.focusSearchAlt || '/']: () => searchInputRef.current?.focus()
  })

  useEffect(() => {
    fetchTemplates()
    // Lazy load: only fetch analytics/reminders when shown
  }, [])

  useEffect(() => {
    // Lazy load analytics only when card is shown
    if (showAnalytics && analytics === null) {
    fetchAnalytics()
    }
  }, [showAnalytics])

  useEffect(() => {
    if (settingsLoading) return
    fetchReminders()
    const intervalId = setInterval(fetchReminders, 5 * 60 * 1000)
    return () => clearInterval(intervalId)
  }, [settingsLoading, settings.reminderHoursAhead])

  useEffect(() => {
    if (settingsLoading) return
    const timeoutId = setTimeout(fetchReminders, 1500)
    return () => clearTimeout(timeoutId)
  }, [tasks, settingsLoading, settings.reminderHoursAhead])

  useEffect(() => {
    const onServerBack = () => {
      fetchTemplates()
      fetchReminders()
      fetchAnalytics()
    }
    window.addEventListener('server-back', onServerBack)
    return () => window.removeEventListener('server-back', onServerBack)
  }, [])

  // Refresh analytics when tasks change (only if already loaded)
  useEffect(() => {
    if (showAnalytics && analytics !== null) {
      fetchAnalytics()
    }
  }, [tasks, showAnalytics])

  useNotifications(reminders, settings.enableNotifications, settings.reminderHoursAhead)

  useEffect(() => {
    // Clear selections for tasks that no longer exist
    const taskIds = new Set(tasks.map(t => t.id))
    setSelectedTasks(prev => {
      const next = new Set()
      prev.forEach(id => {
        if (taskIds.has(id)) {
          next.add(id)
        }
      })
      return next
    })
  }, [tasks])

  const fetchTemplates = async () => {
    try {
      const data = await taskTemplateService.getAll()
      setTemplates(data)
    } catch (err) {
      console.error('Failed to fetch templates:', err)
    }
  }

  const fetchAnalytics = async () => {
    try {
      const data = await analyticsService.getAnalytics()
      setAnalytics(data)
    } catch (err) {
      console.error('Failed to fetch analytics:', err)
    }
  }

  const fetchReminders = async () => {
    try {
      const data = await reminderService.getReminders(settings.reminderHoursAhead)
      setReminders(data)
    } catch (err) {
      console.error('Failed to fetch reminders:', err)
    }
  }

  const handleCreateFromTemplate = (template) => {
    setEditingTask({
      title: template.title,
      description: template.description || '',
      priority: template.priority,
      recurrenceType: template.recurrenceType || 0,
      recurrenceEndDate: template.recurrenceEndDate || null,
      subtasks: template.subtasks || [],
      notes: template.notes || '',
      estimatedTimeMinutes: template.estimatedTimeMinutes || null,
      fileUrl: template.fileUrl || null,
      fileName: template.fileName || null,
      tags: template.tags || [],
      dueDate: template.dueDate || null
    })
    setShowTemplates(false)
    setShowModal(true)
  }

  const handleSaveAsTemplate = (formData, subtasks = []) => {
    setFormDataToSave(formData)
    setSubtasksToSave(subtasks)
    setTemplateNameInput('')
    setShowTemplateNameModal(true)
  }

  const handleConfirmSaveTemplate = async () => {
    if (!templateNameInput?.trim() || !formDataToSave) {
      return
    }

    // Convert subtasks to template format (recursive)
    const convertSubtasksToTemplate = (subtasks) => {
      if (!subtasks || subtasks.length === 0) return null
      return subtasks.map(st => ({
        title: st.title,
        description: st.description || null,
        priority: st.priority || 1,
        subtasks: convertSubtasksToTemplate(st.subtasks)
      }))
    }

    try {
      await taskTemplateService.create({
        name: templateNameInput.trim(),
        title: formDataToSave.title.trim(),
        description: formDataToSave.description?.trim() || null,
        priority: formDataToSave.priority || 1,
        recurrenceType: formDataToSave.recurrenceType || 0,
        recurrenceEndDate: formDataToSave.recurrenceEndDate || null,
        subtasks: convertSubtasksToTemplate(subtasksToSave),
        notes: formDataToSave.notes?.trim() || null,
        estimatedTimeMinutes: formDataToSave.estimatedTimeMinutes ? parseInt(formDataToSave.estimatedTimeMinutes) : null,
        fileUrl: formDataToSave.fileUrl || null,
        fileName: formDataToSave.fileName || null,
        tags: formDataToSave.tags && formDataToSave.tags.length > 0 ? formDataToSave.tags : null,
        dueDate: formDataToSave.dueDate || null
      })
      await fetchTemplates()
      setShowTemplateNameModal(false)
      setTemplateNameInput('')
      setFormDataToSave(null)
      setSubtasksToSave([])
      await alert('Template saved!', 'Success')
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to save template'
      await alert(errorMsg, 'Error')
    }
  }

  const handleEdit = async (task) => {
    editFromModalRef.current = showModal // opened from modal (subtask in modal) vs card
    try {
      const freshTask = await taskService.getById(task.id)
      // Sort subtasks by customOrder
      if (freshTask.subtasks && freshTask.subtasks.length > 0) {
        freshTask.subtasks.sort((a, b) => {
          const orderA = a.customOrder ?? 999999
          const orderB = b.customOrder ?? 999999
          return orderA - orderB
        })
      }
      setEditingTask(freshTask)
      setShowModal(true)
    } catch (err) {
      console.error('Failed to fetch task for editing:', err)
      // Fallback to the task we have
      setEditingTask(task)
      setShowModal(true)
    }
  }

  const handleCreateSubtask = async (parentTaskId, subtaskData) => {
    try {
      await createSubtask(parentTaskId, {
        title: subtaskData.title,
        description: null,
        priority: 1,
        status: 0,
        tags: []
      })
      // Refresh tasks to show new subtask
      await refreshTasks()
      // Refresh the editing task to show updated subtasks
      if (editingTask && editingTask.id === parentTaskId) {
        const updatedTask = await taskService.getById(parentTaskId)
        setEditingTask(updatedTask)
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to create subtask'
      throw new Error(errorMsg)
    }
  }

  const handleDeleteSubtask = async (parentTaskId, subtaskId) => {
    try {
      await deleteTask(subtaskId)
      // Refresh tasks to reflect deletion
      await refreshTasks()
      // Refresh the editing task to show updated subtasks
      if (editingTask && editingTask.id === parentTaskId) {
        const updatedTask = await taskService.getById(parentTaskId)
        setEditingTask(updatedTask)
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to delete subtask'
      throw new Error(errorMsg)
    }
  }

  const handleReorderSubtasks = async (parentTaskId, subtaskIds) => {
    try {
      const updatePromises = subtaskIds.map(async (subtaskId, index) => {
        let subtask = allTasks.find(t => t.id === subtaskId && t.parentTaskId === parentTaskId)
        if (!subtask && editingTask && editingTask.id === parentTaskId && editingTask.subtasks) {
          subtask = editingTask.subtasks.find(st => st.id === subtaskId)
        }
        
        if (subtask) {
          return taskService.update(subtaskId, {
            title: subtask.title,
            description: subtask.description,
            isCompleted: subtask.isCompleted,
            dueDate: subtask.dueDate,
            priority: subtask.priority,
            tags: tagsToArray(subtask.tags),
            fileUrl: subtask.fileUrl || null,
            fileName: subtask.fileName || null,
            notes: subtask.notes || null,
            timeSpentSeconds: subtask.timeSpentSeconds || 0,
            estimatedTimeMinutes: subtask.estimatedTimeMinutes || null,
            recurrenceType: subtask.recurrenceType || 0,
            recurrenceEndDate: subtask.recurrenceEndDate || null,
            status: typeof subtask.status === 'number' ? subtask.status : statusToEnum(subtask.status || 'Active'),
            customOrder: index,
            parentTaskId: parentTaskId
          })
        }
      })
      
      await Promise.all(updatePromises.filter(p => p !== undefined))
    } catch (err) {
      console.error('Failed to reorder subtasks:', err)
      throw err
    }
  }

  const statusToEnum = (status) => {
    if (typeof status === 'number') return status
    const statusMap = { 'Active': 0, 'InProgress': 1, 'OnHold': 2, 'Completed': 3, 'Cancelled': 4 }
    return statusMap[status] ?? 0
  }

  const isEditUnchanged = (task, payload, formData) => {
    const norm = (v) => (v ?? '').toString().trim()
    if (norm(payload.title) !== norm(task.title)) return false
    if (norm(payload.description) !== norm(task.description)) return false
    if ((payload.dueDate || null) !== (task.dueDate || null)) return false
    if ((payload.priority ?? 1) !== (task.priority ?? 1)) return false
    if ((payload.status ?? 0) !== (task.status ?? 0)) return false
    const taskTagIds = (task.tags || []).map((t) => t?.id ?? t).filter(Boolean).sort()
    const formTagIds = (formData.tags || []).map((t) => (typeof t === 'object' ? t?.id : t) ?? t).filter(Boolean).sort()
    if (JSON.stringify(taskTagIds) !== JSON.stringify(formTagIds)) return false
    const a = (task.dependsOnTaskIds || []).slice().sort()
    const b = (formData.dependsOnTaskIds || []).slice().sort()
    if (JSON.stringify(a) !== JSON.stringify(b)) return false
    return true
  }

  const handleUpdateStatus = async (taskId, newStatus) => {
    try {
      // Preserve scroll position (teleport, no animation)
      const scrollPosition = window.scrollY
      
      const task = allTasks.find(t => t.id === taskId)
      if (!task) return
      if (isTaskBlocked(task)) {
        await alert('This task is blocked. Complete its dependencies first.', 'Blocked')
        return
      }
      
      const currentTask = task.parentTaskId 
        ? await taskService.getById(taskId)
        : task
      
      await updateTask(taskId, {
        title: currentTask.title,
        description: currentTask.description,
        isCompleted: newStatus === 'Completed',
        dueDate: currentTask.dueDate,
        priority: currentTask.priority,
        tags: tagsToArray(currentTask.tags),
        fileUrl: currentTask.fileUrl || null,
        fileName: currentTask.fileName || null,
        notes: currentTask.notes,
        timeSpentSeconds: currentTask.timeSpentSeconds || 0,
        estimatedTimeMinutes: currentTask.estimatedTimeMinutes || null,
        recurrenceType: currentTask.recurrenceType || 0,
        recurrenceEndDate: currentTask.recurrenceEndDate || null,
        status: statusToEnum(newStatus),
        parentTaskId: currentTask.parentTaskId,
        customOrder: currentTask.customOrder
      })
      
      // Refresh tasks to update UI with new status
      await refreshTasks()
      
      // Restore scroll position instantly (teleport, no animation)
      // Double requestAnimationFrame ensures it happens after React's render cycle
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if ('scrollBehavior' in document.documentElement.style) {
            window.scrollTo({ top: scrollPosition, behavior: 'instant' })
          } else {
            window.scrollTo(0, scrollPosition)
          }
        })
      })
    } catch (err) {
      console.error('Failed to update status:', err)
      if (isServerWakingError(err)) {
        // Server down/cold: banner shows; no generic error so user sees server-wake flow
        return
      }
      const errorMsg = err.response?.data?.message || 'Failed to update status'
      await alert(errorMsg, 'Error')
    }
  }

  const handleSubmit = async (formData) => {
    setSubmitting(true)
    try {
      const payload = {
        title: formData.title.trim(),
        description: formData.description?.trim() || null,
        dueDate: formData.dueDate || null,
        priority: formData.priority || 1,
        tags: formData.tags || [],
        fileUrl: formData.fileUrl || null,
        fileName: formData.fileName || null,
        recurrenceType: formData.recurrenceType || 0,
        recurrenceEndDate: formData.recurrenceEndDate || null,
        notes: formData.notes?.trim() || null,
        timeSpentSeconds: editingTask?.timeSpentSeconds || 0,
        estimatedTimeMinutes: formData.estimatedTimeMinutes ? parseInt(formData.estimatedTimeMinutes) : null,
        status: statusToEnum(formData.status || 'Active')
      }

      if (editingTask?.id) {
        const updatePayload = {
          ...payload,
          isCompleted: formData.status === 'Completed',
          status: statusToEnum(formData.status || 'Active'),
          timeSpentSeconds: editingTask.timeSpentSeconds || 0,
          estimatedTimeMinutes: formData.estimatedTimeMinutes ? parseInt(formData.estimatedTimeMinutes) : editingTask.estimatedTimeMinutes || null
        }
        
        // Preserve parentTaskId and customOrder for subtasks
        if (editingTask.parentTaskId) {
          updatePayload.parentTaskId = editingTask.parentTaskId
        }
        if (editingTask.customOrder != null) {
          updatePayload.customOrder = editingTask.customOrder
        }
        
        if (isEditUnchanged(editingTask, updatePayload, formData)) {
          setShowModal(false)
          setEditingTask(null)
          setSubmitting(false)
          return
        }
        
        await taskService.update(editingTask.id, updatePayload)
        
        // Update dependencies
        const currentDeps = editingTask.dependsOnTaskIds || []
        const newDeps = formData.dependsOnTaskIds || []
        
        // Remove dependencies that are no longer selected
        for (const depId of currentDeps) {
          if (!newDeps.includes(depId)) {
            try {
              await taskService.removeDependency(editingTask.id, depId)
            } catch (err) {
              console.error('Failed to remove dependency:', err)
            }
          }
        }
        
        // Add new dependencies
        for (const depId of newDeps) {
          if (!currentDeps.includes(depId)) {
            try {
              await taskService.addDependency(editingTask.id, depId)
            } catch (err) {
              const errorMsg = err.response?.data?.message || 'Failed to add dependency'
              await alert(errorMsg, 'Error')
            }
          }
        }
      } else {
        const createdTask = await taskService.create(payload)
        
        // Get subtasks to create (from template or pending list)
        const subtasksToCreate = formData.pendingSubtasks || editingTask?.subtasks || []
        
        // Create subtasks recursively if any exist
        if (subtasksToCreate.length > 0 && createdTask) {
          const createSubtasksRecursive = async (subtasks, parentTaskId, customOrder = 0) => {
            for (let i = 0; i < subtasks.length; i++) {
              const subtask = subtasks[i]
              try {
                const createdSubtask = await createSubtask(parentTaskId, {
                  title: subtask.title,
                  description: subtask.description || null,
                  priority: subtask.priority || 1,
                  status: 0,
                  tags: []
                })
                
                // Update customOrder to preserve order
                if (createdSubtask) {
                await taskService.update(createdSubtask.id, {
                  title: createdSubtask.title,
                  description: createdSubtask.description,
                  isCompleted: false,
                  dueDate: createdSubtask.dueDate,
                  priority: createdSubtask.priority,
                  tags: tagsToArray(createdSubtask.tags),
                  fileUrl: createdSubtask.fileUrl || null,
                    fileName: createdSubtask.fileName || null,
                    notes: createdSubtask.notes || null,
                    timeSpentSeconds: 0,
                    estimatedTimeMinutes: createdSubtask.estimatedTimeMinutes || null,
                    recurrenceType: createdSubtask.recurrenceType || 0,
                    recurrenceEndDate: createdSubtask.recurrenceEndDate || null,
                    status: 0,
                    customOrder: i,
                    parentTaskId: parentTaskId
                  })
                  
                  // Recursively create nested subtasks
                  if (subtask.subtasks && subtask.subtasks.length > 0) {
                    await createSubtasksRecursive(subtask.subtasks, createdSubtask.id, 0)
                  }
                }
              } catch (err) {
                console.error('Failed to create subtask from template:', err)
              }
            }
          }
          
          await createSubtasksRecursive(subtasksToCreate, createdTask.id, 0)
        }
        
        await refreshTasks()
        
        setTimeout(() => {
          const taskElement = document.querySelector(`[data-task-id="${createdTask.id}"]`)
          if (taskElement) {
            taskElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }
        }, 100)
      }
      
      await refreshTasks()

      // Subtask: switch to parent only if we opened from inside the modal; else close and go back to list
      if (editingTask?.parentTaskId) {
        if (editFromModalRef.current) {
          try {
            const parentId = editingTask.parentTaskId
            const parentTask = await taskService.getById(parentId)
            if (cardRefs.current[parentId]) {
              cardRefs.current[parentId].scrollIntoView({ behavior: 'instant', block: 'center' })
            }
            setEditingTask(parentTask)
          } catch (err) {
            console.error('Failed to fetch parent task:', err)
            setShowModal(false)
            setEditingTask(null)
          }
        } else {
          setShowModal(false)
          setEditingTask(null)
        }
      } else {
        setShowModal(false)
        setEditingTask(null)
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to save task'
      await alert(errorMsg, 'Error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id) => {
    if (!await confirm('Are you sure you want to delete this task?', 'Delete Task')) return
    try {
      // Preserve scroll position (teleport, no animation)
      const scrollPosition = window.scrollY
      
      await deleteTask(id)
      
      // Restore scroll position instantly (teleport, no animation)
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if ('scrollBehavior' in document.documentElement.style) {
            window.scrollTo({ top: scrollPosition, behavior: 'instant' })
          } else {
            window.scrollTo(0, scrollPosition)
          }
        })
      })
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to delete task'
      await alert(errorMsg, 'Error')
    }
  }

  // Recursive function to build complete task tree with all nested subtasks
  const buildTaskTree = async (task) => {
    const taskTree = { ...task, subtasks: [] }
    
    // Fetch direct children
    if (task.subtasks && task.subtasks.length > 0) {
      for (const subtask of task.subtasks) {
        // Fetch full subtask data (which includes its direct children)
        const fullSubtask = await taskService.getById(subtask.id)
        // Recursively build the subtask tree
        const subtaskTree = await buildTaskTree(fullSubtask)
        taskTree.subtasks.push(subtaskTree)
      }
    }
    
    return taskTree
  }

  // Recursive function to duplicate a task and all its nested subtasks
  const duplicateTaskRecursive = async (taskTree, parentTaskId = null, customOrder = null) => {
    // Create the task (as parent or subtask)
    const taskData = {
      title: `${taskTree.title} (Copy)`,
      description: taskTree.description,
      dueDate: taskTree.dueDate,
      priority: taskTree.priority,
      tags: tagsToArray(taskTree.tags),
      fileUrl: taskTree.fileUrl,
      fileName: taskTree.fileName,
      recurrenceType: taskTree.recurrenceType || 0,
      recurrenceEndDate: taskTree.recurrenceEndDate,
      notes: taskTree.notes,
      estimatedTimeMinutes: taskTree.estimatedTimeMinutes || null,
      status: typeof taskTree.status === 'number' 
        ? (taskTree.status === 3 ? 0 : taskTree.status) // Reset Completed to Active
        : statusToEnum(taskTree.status === 'Completed' ? 'Active' : (taskTree.status || taskTree.statusName || 'Active')),
      timeSpentSeconds: 0 // Reset time spent
    }

    let duplicatedTask
    if (parentTaskId) {
      // Create as subtask
      duplicatedTask = await createSubtask(parentTaskId, taskData)
      // Update customOrder to preserve original order
      if (customOrder !== null) {
        await taskService.update(duplicatedTask.id, {
          title: duplicatedTask.title,
          description: duplicatedTask.description,
          isCompleted: duplicatedTask.isCompleted || false,
          dueDate: duplicatedTask.dueDate,
          priority: duplicatedTask.priority,
          tags: tagsToArray(duplicatedTask.tags),
          fileUrl: duplicatedTask.fileUrl || null,
          fileName: duplicatedTask.fileName || null,
          notes: duplicatedTask.notes || null,
          timeSpentSeconds: duplicatedTask.timeSpentSeconds || 0,
          estimatedTimeMinutes: duplicatedTask.estimatedTimeMinutes || null,
          recurrenceType: duplicatedTask.recurrenceType || 0,
          recurrenceEndDate: duplicatedTask.recurrenceEndDate || null,
          status: typeof duplicatedTask.status === 'number' ? duplicatedTask.status : statusToEnum(duplicatedTask.status || 'Active'),
          customOrder: customOrder,
          parentTaskId: parentTaskId
        })
      }
    } else {
      // Create as parent task
      duplicatedTask = await createTask(taskData)
    }

    // Recursively duplicate nested subtasks from the tree, preserving order
    if (taskTree.subtasks && taskTree.subtasks.length > 0) {
      for (let i = 0; i < taskTree.subtasks.length; i++) {
        const subtaskTree = taskTree.subtasks[i]
        // Use index to preserve order (subtasks array is already sorted by backend)
        await duplicateTaskRecursive(subtaskTree, duplicatedTask.id, i)
      }
    }

    return duplicatedTask
  }

  const handleDuplicate = async (task) => {
    try {
      // Preserve scroll position (teleport, no animation)
      const scrollPosition = window.scrollY
      
      // Fetch full task data
      const fullTask = await taskService.getById(task.id)
      
      // Build complete task tree with all nested subtasks recursively
      const taskTree = await buildTaskTree(fullTask)
      
      // Recursively duplicate task and all nested subtasks from the tree
      await duplicateTaskRecursive(taskTree)
      
      // Refresh tasks to show duplicated task and all subtasks
      await refreshTasks()
      
      // Restore scroll position instantly (teleport, no animation)
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if ('scrollBehavior' in document.documentElement.style) {
            window.scrollTo({ top: scrollPosition, behavior: 'instant' })
          } else {
            window.scrollTo(0, scrollPosition)
          }
        })
      })
    } catch (err) {
      console.error('Failed to duplicate task:', err)
      const errorMsg = err.response?.data?.message || err.message || 'Failed to duplicate task'
      await alert(errorMsg, 'Error')
    }
  }

  const handleArchive = async (id) => {
    try {
      await archiveTask(id)
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to archive task'
      await alert(errorMsg, 'Error')
    }
  }

  const handleUnarchive = async (id) => {
    try {
      await unarchiveTask(id)
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to unarchive task'
      await alert(errorMsg, 'Error')
    }
  }

  const handleTimeUpdate = async (taskId, timeSpentSeconds) => {
    // Skip time updates during bulk operations to prevent multiple refreshes
    if (isBulkOperationRef.current) return
    
    try {
      // Preserve scroll position (teleport, no animation)
      const scrollPosition = window.scrollY
      
      const task = allTasks.find(t => t.id === taskId)
      if (task) {
        await taskService.update(taskId, {
          title: task.title,
          description: task.description,
          isCompleted: task.isCompleted,
          dueDate: task.dueDate,
          priority: task.priority,
          tags: tagsToArray(task.tags),
          fileUrl: task.fileUrl || null,
          fileName: task.fileName || null,
          notes: task.notes,
          timeSpentSeconds: timeSpentSeconds,
          estimatedTimeMinutes: task.estimatedTimeMinutes || null,
          recurrenceType: task.recurrenceType || 0,
          recurrenceEndDate: task.recurrenceEndDate || null,
          status: typeof task.status === 'number' ? task.status : statusToEnum(task.status || 'Active'),
          parentTaskId: task.parentTaskId,
          customOrder: task.customOrder
        })
        
        // Refresh to update UI with saved time
        await refreshTasks()
        
        // Restore scroll position instantly (teleport, no animation)
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if ('scrollBehavior' in document.documentElement.style) {
              window.scrollTo({ top: scrollPosition, behavior: 'instant' })
            } else {
              window.scrollTo(0, scrollPosition)
            }
          })
        })
      }
    } catch (err) {
      console.error('Failed to update time:', err)
    }
  }


  const handleToggleComplete = async (task) => {
    try {
      // Preserve scroll position (teleport, no animation)
      const scrollPosition = window.scrollY
      const isSubtask = !!task.parentTaskId
      if (!isSubtask && isTaskBlocked(task)) {
        await alert('This task is blocked. Complete its dependencies first.', 'Blocked')
        return
      }

      const isCurrentlyCompleted = task.isCompleted || task.status === 'Completed' || task.status === 3 || task.statusName === 'Completed'
      const newStatus = isCurrentlyCompleted ? statusToEnum('Active') : statusToEnum('Completed')
      
      let currentTask = task
      if (task.parentTaskId) {
        try {
          currentTask = await taskService.getById(task.id)
        } catch (err) {
          console.error('Failed to fetch task data:', err)
        }
      }
      
      const updatePayload = {
        title: currentTask.title,
        description: currentTask.description,
        isCompleted: !isCurrentlyCompleted,
        dueDate: currentTask.dueDate,
        priority: currentTask.priority,
        tags: tagsToArray(currentTask.tags),
        fileUrl: currentTask.fileUrl || null,
        fileName: currentTask.fileName || null,
        notes: currentTask.notes,
        timeSpentSeconds: currentTask.timeSpentSeconds || 0,
        estimatedTimeMinutes: currentTask.estimatedTimeMinutes || null,
        recurrenceType: currentTask.recurrenceType || 0,
        recurrenceEndDate: currentTask.recurrenceEndDate || null,
        status: newStatus
      }
      
      if (currentTask.parentTaskId) {
        updatePayload.parentTaskId = currentTask.parentTaskId
      }
      if (currentTask.customOrder != null) {
        updatePayload.customOrder = currentTask.customOrder
      }
      
      await taskService.update(task.id, updatePayload)
      await refreshTasks()
      
      // Restore scroll position instantly (teleport, no animation)
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if ('scrollBehavior' in document.documentElement.style) {
            window.scrollTo({ top: scrollPosition, behavior: 'instant' })
          } else {
            window.scrollTo(0, scrollPosition)
          }
        })
      })
    } catch (err) {
      console.error('Failed to update task:', err)
    }
  }

  const handleSelectTask = (taskId) => {
    setSelectedTasks(prev => {
      const next = new Set(prev)
      if (next.has(taskId)) {
        next.delete(taskId)
      } else {
        next.add(taskId)
      }
      return next
    })
  }

  const handleSelectAll = () => {
    setSelectedTasks(new Set(tasks.map(t => t.id)))
  }

  const handleUnselectAll = () => {
    setSelectedTasks(new Set())
  }

  const handleBulkDelete = async () => {
    if (selectedTasks.size === 0) return
    if (!await confirm(`Delete ${selectedTasks.size} task(s)?`, 'Bulk Delete')) return
    
    try {
      await bulkDeleteTasks(Array.from(selectedTasks))
      setSelectedTasks(new Set())
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to delete tasks'
      await alert(errorMsg, 'Error')
    }
  }

  const handleBulkComplete = async () => {
    if (selectedTasks.size === 0) return
    if (!await confirm(`Complete ${selectedTasks.size} task(s)?`, 'Bulk Complete')) return
    
    try {
      const blockedCount = Array.from(selectedTasks).filter(id => {
        const t = allTasks.find(task => task.id === id)
        return isTaskBlocked(t)
      }).length
      if (blockedCount > 0) {
        await alert(`Cannot complete tasks while blocked (${blockedCount} blocked). Complete dependencies first.`, 'Blocked')
        return
      }
      await bulkCompleteTasks(Array.from(selectedTasks))
      setSelectedTasks(new Set())
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to complete tasks'
      await alert(errorMsg, 'Error')
    }
  }

  const handleBulkArchive = async () => {
    if (selectedTasks.size === 0) return
    if (!await confirm(`Archive ${selectedTasks.size} completed task(s)?`, 'Bulk Archive')) return
    
    try {
      for (const taskId of selectedTasks) {
        await archiveTask(taskId)
      }
      setSelectedTasks(new Set())
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to archive tasks'
      await alert(errorMsg, 'Error')
    }
  }

  const handleBulkUnarchive = async () => {
    if (selectedTasks.size === 0) return
    if (!await confirm(`Unarchive ${selectedTasks.size} task(s)?`, 'Bulk Unarchive')) return
    
    try {
      for (const taskId of selectedTasks) {
        await unarchiveTask(taskId)
      }
      setSelectedTasks(new Set())
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to unarchive tasks'
      await alert(errorMsg, 'Error')
    }
  }

  const handleBulkStatusChange = async (newStatus) => {
    if (selectedTasks.size === 0) return
    if (!await confirm(`Change status of ${selectedTasks.size} task(s) to ${newStatus}?`, 'Bulk Status Change')) return
    
    try {
      const blockedCount = Array.from(selectedTasks).filter(id => {
        const t = allTasks.find(task => task.id === id)
        return isTaskBlocked(t)
      }).length
      if (blockedCount > 0) {
        await alert(`Cannot change status while blocked (${blockedCount} blocked). Complete dependencies first.`, 'Blocked')
        return
      }
      // Set flag to prevent timer operations from triggering refreshes
      isBulkOperationRef.current = true
      localStorage.setItem('taskTrackerBulkOperation', 'true')
      
      // Preserve scroll position
      const scrollPosition = window.scrollY
      
      const taskIds = Array.from(selectedTasks)
      
      // For "On Hold", stop any running timers and save their time first
      if (newStatus === 'OnHold') {
        try {
          const settings = await settingsService.get()
          if (settings?.activeTimer && taskIds.includes(settings.activeTimer.taskId)) {
            const timer = settings.activeTimer
            const elapsed = Math.floor((Date.now() - timer.startTime) / 1000)
            const task = allTasks.find(t => t.id === timer.taskId)
            if (task) {
              const newTime = (task.timeSpentSeconds || 0) + elapsed
              await taskService.update(timer.taskId, {
                title: task.title,
                description: task.description,
                isCompleted: task.isCompleted,
                dueDate: task.dueDate,
                priority: task.priority,
                tags: tagsToArray(task.tags),
                fileUrl: task.fileUrl || null,
                fileName: task.fileName || null,
                notes: task.notes,
                timeSpentSeconds: newTime,
                estimatedTimeMinutes: task.estimatedTimeMinutes || null,
                recurrenceType: task.recurrenceType || 0,
                recurrenceEndDate: task.recurrenceEndDate || null,
                status: typeof task.status === 'number' ? task.status : statusToEnum(task.status || 'Active'),
                parentTaskId: task.parentTaskId,
                customOrder: task.customOrder
              })
            }
            await settingsService.update({ ...settings, activeTimer: null })
          }
        } catch (err) {
          console.error('Failed to stop timer:', err)
        }
      }
      
      // Use taskService.update directly to avoid multiple refreshes from useTasks hook
      const updatePromises = taskIds.map(async (taskId) => {
        const task = allTasks.find(t => t.id === taskId)
        if (!task) return
        
        // Fetch full task data if it's a subtask
        const currentTask = task.parentTaskId 
          ? await taskService.getById(taskId)
          : task
        
        // Use taskService.update directly (doesn't trigger refreshTasks)
        await taskService.update(taskId, {
          title: currentTask.title,
          description: currentTask.description,
          isCompleted: newStatus === 'Completed',
          dueDate: currentTask.dueDate,
          priority: currentTask.priority,
          tags: tagsToArray(currentTask.tags),
          fileUrl: currentTask.fileUrl || null,
          fileName: currentTask.fileName || null,
          notes: currentTask.notes,
          timeSpentSeconds: currentTask.timeSpentSeconds || 0,
          estimatedTimeMinutes: currentTask.estimatedTimeMinutes || null,
          recurrenceType: currentTask.recurrenceType || 0,
          recurrenceEndDate: currentTask.recurrenceEndDate || null,
          status: statusToEnum(newStatus),
          parentTaskId: currentTask.parentTaskId,
          customOrder: currentTask.customOrder
        })
      })
      
      await Promise.all(updatePromises)
      
      // Single refresh after all updates complete
      await refreshTasks()
      setSelectedTasks(new Set())
      
      // Clear bulk operation flag after refresh (with delay to prevent timer operations from triggering refreshes)
      setTimeout(() => {
        isBulkOperationRef.current = false
        localStorage.removeItem('taskTrackerBulkOperation')
      }, 300)
      
      // For "In Progress", timers will auto-start in TaskCard components via useEffect
      // For "On Hold", timers are already stopped above
      
      // Restore scroll position
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if ('scrollBehavior' in document.documentElement.style) {
            window.scrollTo({ top: scrollPosition, behavior: 'instant' })
          } else {
            window.scrollTo(0, scrollPosition)
          }
        })
      })
    } catch (err) {
      isBulkOperationRef.current = false
      localStorage.removeItem('taskTrackerBulkOperation')
      console.error('Failed to update status:', err)
      if (isServerWakingError(err)) return
      const errorMsg = err.response?.data?.message || 'Failed to update status'
      await alert(errorMsg, 'Error')
    }
  }

  const handleQuickFilter = (filter) => {
    if (quickFilter === filter) {
      setQuickFilter('')
    } else {
      setQuickFilter(filter)
    }
  }

  const handleFilterByPriority = (priority) => {
    if (quickFilter === `priority-${priority}`) {
      setQuickFilter('')
    } else {
      setQuickFilter(`priority-${priority}`)
    }
  }

  const handleFilterByTag = (tag) => {
    setSearch(tag)
  }

  const handleFilterByRecurrence = (recurrenceType) => {
    if (quickFilter === `recurrence-${recurrenceType}`) {
      setQuickFilter('')
    } else {
      setQuickFilter(`recurrence-${recurrenceType}`)
    }
  }

  const handleDragStart = (e, taskId) => {
    e.stopPropagation()
    setDraggedTaskId(taskId)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/html', taskId)
  }

  const handleDragOver = (e, index) => {
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'move'
    setDragOverIndex(index)
  }

  const handleDragLeave = () => {
    setDragOverIndex(null)
  }

  const handleDrop = async (e, dropIndex) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOverIndex(null)
    
    if (draggedTaskId === null) return
    
    const currentIndex = sortedTasks.findIndex(t => t.id === draggedTaskId)
    if (currentIndex === -1 || currentIndex === dropIndex) {
      setDraggedTaskId(null)
      return
    }
    
    // Reorder tasks
    const newTasks = [...sortedTasks]
    const [removed] = newTasks.splice(currentIndex, 1)
    newTasks.splice(dropIndex, 0, removed)
    
    // Update order in backend
    const taskIds = newTasks.map(t => t.id)
    try {
      await taskService.reorder(taskIds)
      // Reordering implies custom sort
      setSortBy('custom')
      // Refresh tasks without full page reload
      if (refreshTasks) {
        await refreshTasks()
      }
    } catch (err) {
      console.error('Failed to reorder tasks:', err)
      // Only show alert if it's not an auth error (auth errors are handled by interceptor)
      if (err.response?.status !== 401) {
        await alert('Failed to save task order', 'Error')
      }
    } finally {
      setDraggedTaskId(null)
    }
  }

  const handleDragEnd = () => {
    setDraggedTaskId(null)
    setDragOverIndex(null)
  }

  const formatDate = (date, format) => {
    if (!date) return ''
    const d = new Date(date)
    if (format === 'ISO') return d.toISOString()
    
    const day = String(d.getDate()).padStart(2, '0')
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const year = d.getFullYear()
    
    return format
      .replace('MM', month)
      .replace('DD', day)
      .replace('YYYY', year)
  }

  const handleImportCSV = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    if (!file.name.endsWith('.csv')) {
      await alert('Please select a CSV file', 'Invalid File')
      return
    }
    
    try {
      await taskService.importCsv(file)
      await alert('Tasks imported successfully!', 'Success')
      // Reset file input
      e.target.value = ''
      // Refresh tasks while preserving sort order
      if (refreshTasks) {
        await refreshTasks()
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to import CSV file'
      await alert(errorMsg, 'Error')
      e.target.value = ''
    }
  }

  const handleExportCSV = async () => {
    const fields = settings.exportFields
    const includeSubtasks = settings.exportIncludeSubtasks !== false // default to true
    const headers = []
    const fieldOrder = []
    
    if (fields.title) { headers.push('Title'); fieldOrder.push('title') }
    if (fields.description) { headers.push('Description'); fieldOrder.push('description') }
    if (fields.status) { headers.push('Status'); fieldOrder.push('status') }
    if (fields.priority) { headers.push('Priority'); fieldOrder.push('priority') }
    if (fields.dueDate) { headers.push('Due Date'); fieldOrder.push('dueDate') }
    if (fields.createdAt) { headers.push('Created At'); fieldOrder.push('createdAt') }
    if (fields.notes) { headers.push('Notes'); fieldOrder.push('notes') }
    if (fields.tags) { headers.push('Tags'); fieldOrder.push('tags') }
    if (fields.recurrence) { headers.push('Recurrence'); fieldOrder.push('recurrence') }
    if (fields.attachment) { headers.push('File Name'); fieldOrder.push('attachment') }
    if (fields.timeSpent) { headers.push('Time Spent (seconds)'); fieldOrder.push('timeSpent') }
    if (fields.estimatedTime) { headers.push('Estimated Time (minutes)'); fieldOrder.push('estimatedTime') }
    
    if (headers.length === 0) {
      await alert('Please select at least one field to export', 'Export Error')
      return
    }
    
    // Add Parent Task column if including subtasks
    if (includeSubtasks) {
      headers.push('Parent Task')
      fieldOrder.push('parentTask')
    }
    
    const priorityMap = { 0: 'Low', 1: 'Medium', 2: 'High' }
    const recurrenceMap = { 0: 'None', 1: 'Daily', 2: 'Weekly', 3: 'Monthly' }
    const dateFormat = settings.exportDateFormat || 'MM/DD/YYYY'
    
    // Filter to selected tasks if any are selected, otherwise use all tasks
    const tasksToExport = selectedTasks.size > 0 
      ? allTasks.filter(task => selectedTasks.has(task.id))
      : allTasks
    
    // Flatten tasks and subtasks if including subtasks
    const allTasksToExport = []
    if (includeSubtasks) {
      tasksToExport.forEach(task => {
        // Add parent task
        allTasksToExport.push({ ...task, isSubtask: false, parentTaskTitle: '' })
        // Add subtasks if they exist
        if (task.subtasks && task.subtasks.length > 0) {
          task.subtasks.forEach(subtask => {
            allTasksToExport.push({ ...subtask, isSubtask: true, parentTaskTitle: task.title })
          })
        }
      })
    } else {
      // Only parent tasks
      allTasksToExport.push(...tasksToExport.map(task => ({ ...task, isSubtask: false, parentTaskTitle: '' })))
    }
    
    const rows = allTasksToExport.map(task => {
      const row = []
      fieldOrder.forEach(field => {
        switch (field) {
          case 'title':
            row.push(task.title)
            break
          case 'description':
            row.push(task.description || '')
            break
          case 'status':
            let statusName = task.statusName || (task.isCompleted ? 'Completed' : 'Active')
            // Format status names for user-friendly display
            if (statusName === 'InProgress') statusName = 'In Progress'
            else if (statusName === 'OnHold') statusName = 'On Hold'
            row.push(statusName)
            break
          case 'priority':
            row.push(priorityMap[task.priority] || 'Medium')
            break
          case 'dueDate':
            row.push(formatDate(task.dueDate, dateFormat))
            break
          case 'createdAt':
            row.push(formatDate(task.createdAt, dateFormat))
            break
          case 'notes':
            row.push(task.notes || '')
            break
          case 'tags':
            row.push(task.tags ? Object.keys(task.tags).join('; ') : '')
            break
          case 'recurrence':
            row.push(recurrenceMap[task.recurrenceType || 0] || 'None')
            break
          case 'attachment':
            row.push(task.fileName || '')
            break
          case 'timeSpent':
            row.push(task.timeSpentSeconds || 0)
            break
          case 'estimatedTime':
            row.push(task.estimatedTimeMinutes || '')
            break
          case 'parentTask':
            row.push(task.parentTaskTitle || '')
            break
        }
      })
      return row
    })

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `tasks_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="container-main">
      <Navbar />

      <div className="container mt-3 mt-md-4 px-3 px-md-0">
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-3 mb-md-4 gap-2">
          <div className="d-flex gap-2 w-100 w-md-auto flex-wrap">
            <label 
              className="btn btn-outline-primary flex-fill flex-md-none" 
              style={{ cursor: 'pointer', minWidth: '140px' }}
            >
              <span className="d-none d-sm-inline">📥 Import CSV</span>
              <span className="d-sm-none">📥</span>
              <input
                type="file"
                accept=".csv"
                onChange={handleImportCSV}
                style={{ display: 'none' }}
              />
            </label>
            {tasks.length > 0 && (
              <button 
                className="btn btn-outline-primary flex-fill flex-md-none" 
                onClick={handleExportCSV}
                style={{ 
                  fontSize: selectedTasks.size > 0 ? '0.875rem' : '1rem',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  minWidth: '140px'
                }}
              >
                <span className="d-none d-sm-inline">
                  📊 {selectedTasks.size > 0 ? `Export Selected (${selectedTasks.size})` : 'Export CSV'}
                </span>
                <span className="d-sm-none">📊 {selectedTasks.size > 0 ? `(${selectedTasks.size})` : ''}</span>
              </button>
            )}
            <button 
              className="btn btn-outline-primary flex-fill flex-md-none" 
              onClick={() => setShowTemplates(!showTemplates)}
              style={{ minWidth: '140px' }}
            >
              <span className="d-none d-sm-inline">📋 Templates</span>
              <span className="d-sm-none">📋</span>
            </button>
            <button 
              className="btn btn-outline-primary flex-fill flex-md-none" 
              onClick={() => setShowAnalytics(!showAnalytics)}
              style={{ minWidth: '140px' }}
            >
              <span className="d-none d-sm-inline">📈 Analytics</span>
              <span className="d-sm-none">📈</span>
            </button>
            <button 
              className="btn btn-outline-primary flex-fill flex-md-none position-relative" 
              onClick={() => setShowReminders(!showReminders)}
              style={{ minWidth: '140px' }}
            >
              <span className="d-none d-sm-inline">📧 Reminders</span>
              <span className="d-sm-none">📧</span>
              {reminders && (reminders.overdueTasks?.length > 0 || reminders.upcomingTasks?.length > 0) && (
                <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger" style={{ fontSize: '0.65rem', padding: '2px 5px' }}>
                  {(reminders.overdueTasks?.length || 0) + (reminders.upcomingTasks?.length || 0)}
                </span>
              )}
            </button>
          </div>
        </div>

        {showTemplates && (
          <div className="mb-3">
            <div className="card">
              <div className="card-header d-flex justify-content-between align-items-center">
                <h5 className="mb-0 fw-bold">📋 Task Templates</h5>
                <button className="btn btn-sm btn-close" onClick={() => setShowTemplates(false)}></button>
              </div>
              <div className="card-body">
                {templates.length === 0 ? (
                  <p className="mb-0" style={{ color: 'inherit', opacity: 0.8 }}>No templates. Create a task and save it as a template.</p>
                ) : (
                  <div className="row g-2">
                    {templates.map(template => (
                      <div key={template.id} className="col-12 col-md-6 col-lg-4">
                        <div className="card h-100">
                          <div className="card-body">
                            <h6 className="card-title">{template.name}</h6>
                            <p className="card-text small text-muted mb-2">{template.title}</p>
                            <div className="d-flex gap-2">
                              <button
                                className="btn btn-sm btn-primary flex-fill"
                                onClick={() => handleCreateFromTemplate(template)}
                              >
                                Use
                              </button>
                              <button
                                className="btn btn-sm btn-outline-danger"
                                onClick={async () => {
                                  if (await confirm('Delete this template?', 'Delete Template')) {
                                    try {
                                      await taskTemplateService.delete(template.id)
                                      await fetchTemplates()
                                    } catch (err) {
                                      await alert('Failed to delete template', 'Error')
                                    }
                                  }
                                }}
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {showAnalytics && analytics && (
          <div className="mb-3">
            <div className="card">
              <div className="card-header d-flex justify-content-between align-items-center">
                <h5 className="mb-0 fw-bold">📈 Task Analytics</h5>
                <button className="btn btn-sm btn-close" onClick={() => setShowAnalytics(false)}></button>
              </div>
              <div className="card-body">
                <div className="row g-3">
                  <div className="col-6 col-md-3">
                    <div className="text-center">
                      <h3 className="mb-1 fw-bold">{analytics.totalTasks}</h3>
                      <small style={{ color: 'inherit', opacity: 0.85, fontWeight: 500 }}>Total Tasks</small>
                    </div>
                  </div>
                  <div className="col-6 col-md-3">
                    <div className="text-center">
                      <h3 className="mb-1 fw-bold text-primary">{analytics.activeTasks}</h3>
                      <small style={{ color: 'inherit', opacity: 0.85, fontWeight: 500 }}>Active</small>
                    </div>
                  </div>
                  <div className="col-6 col-md-3">
                    <div className="text-center">
                      <h3 className="mb-1 fw-bold text-success">{analytics.completedTasks}</h3>
                      <small style={{ color: 'inherit', opacity: 0.85, fontWeight: 500 }}>Completed</small>
                    </div>
                  </div>
                  <div className="col-6 col-md-3">
                    <div className="text-center">
                      <h3 className="mb-1 fw-bold text-danger">{analytics.overdueTasks}</h3>
                      <small style={{ color: 'inherit', opacity: 0.85, fontWeight: 500 }}>Overdue</small>
                    </div>
                  </div>
                  <div className="col-6 col-md-3">
                    <div className="text-center">
                      <h3 className="mb-1 fw-bold text-warning">{analytics.highPriorityTasks}</h3>
                      <small style={{ color: 'inherit', opacity: 0.85, fontWeight: 500 }}>High Priority</small>
                    </div>
                  </div>
                  <div className="col-6 col-md-3">
                    <div className="text-center">
                      <h3 className="mb-1 fw-bold">{analytics.tasksThisWeek}</h3>
                      <small style={{ color: 'inherit', opacity: 0.85, fontWeight: 500 }}>This Week</small>
                    </div>
                  </div>
                  <div className="col-6 col-md-3">
                    <div className="text-center">
                      <h3 className="mb-1 fw-bold">{analytics.tasksThisMonth}</h3>
                      <small style={{ color: 'inherit', opacity: 0.85, fontWeight: 500 }}>This Month</small>
                    </div>
                  </div>
                </div>
                <div className="mt-3">
                  <h6 className="fw-semibold mb-2">By Priority</h6>
                  <div className="d-flex flex-wrap gap-2">
                    {Object.entries(analytics.tasksByPriority).map(([priority, count]) => (
                      <span key={priority} className="badge bg-info fw-semibold">
                        {priority}: {count}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {showReminders && reminders && (
          <div className="mb-3">
            <div className="card">
              <div className="card-header d-flex justify-content-between align-items-center">
                <h5 className="mb-0 fw-bold">📧 Task Reminders</h5>
                <button className="btn btn-sm btn-close" onClick={() => setShowReminders(false)}></button>
              </div>
              <div className="card-body">
                {reminders.overdueTasks.length === 0 && reminders.upcomingTasks.length === 0 ? (
                  <p className="mb-0" style={{ color: 'inherit', opacity: 0.8 }}>No tasks due in the next 24 hours. Great job!</p>
                ) : (
                  <>
                    {reminders.overdueTasks.length > 0 && (
                      <div className="mb-3">
                        <h6 className="text-danger fw-bold mb-2">⚠️ Overdue Tasks ({reminders.overdueTasks.length})</h6>
                        <div className="list-group">
                          {reminders.overdueTasks.map(task => (
                            <div key={task.id} className="list-group-item">
                              <div className="d-flex justify-content-between align-items-start">
                                <div className="flex-grow-1">
                                  <h6 className="mb-1 fw-semibold">{task.title}</h6>
                                  <small style={{ color: 'inherit', opacity: 0.85, display: 'block' }}>
                                    Due: {new Date(task.dueDate).toLocaleString()} 
                                    <span className="text-danger fw-semibold"> ({task.hoursUntilDue} hours ago)</span>
                                  </small>
                                </div>
                                <span className={`badge ${task.priority === 2 ? 'bg-danger' : task.priority === 1 ? 'bg-warning' : 'bg-info'} ms-2`}>
                                  {task.priority === 2 ? 'High' : task.priority === 1 ? 'Medium' : 'Low'}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {reminders.upcomingTasks.length > 0 && (
                      <div>
                        <h6 className="text-warning fw-bold mb-2">⏰ Upcoming Tasks ({reminders.upcomingTasks.length})</h6>
                        <div className="list-group">
                          {reminders.upcomingTasks.map(task => (
                            <div key={task.id} className="list-group-item">
                              <div className="d-flex justify-content-between align-items-start">
                                <div className="flex-grow-1">
                                  <h6 className="mb-1 fw-semibold">{task.title}</h6>
                                  <small style={{ color: 'inherit', opacity: 0.85, display: 'block' }}>
                                    Due: {new Date(task.dueDate).toLocaleString()} 
                                    <span className="text-warning fw-semibold"> (in {task.hoursUntilDue} hours)</span>
                                  </small>
                                </div>
                                <span className={`badge ${task.priority === 2 ? 'bg-danger' : task.priority === 1 ? 'bg-warning' : 'bg-info'} ms-2`}>
                                  {task.priority === 2 ? 'High' : task.priority === 1 ? 'Medium' : 'Low'}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="d-flex flex-wrap gap-2 mb-3">
          <button
            className={`btn btn-sm ${quickFilter === 'today' ? 'btn-primary' : 'btn-outline-primary'}`}
            onClick={() => handleQuickFilter('today')}
          >
            📅 Today
          </button>
          <button
            className={`btn btn-sm ${quickFilter === 'week' ? 'btn-primary' : 'btn-outline-primary'}`}
            onClick={() => handleQuickFilter('week')}
          >
            📆 This Week
          </button>
          <button
            className={`btn btn-sm ${quickFilter === 'high' ? 'btn-primary' : 'btn-outline-primary'}`}
            onClick={() => handleQuickFilter('high')}
          >
            🔴 High Priority
          </button>
          <button
            className={`btn btn-sm ${showArchived ? 'btn-primary' : 'btn-outline-primary'}`}
            onClick={() => setShowArchived(!showArchived)}
            title={showArchived ? 'Hide archived tasks' : 'Show archived tasks'}
          >
            {showArchived ? '📦 Hide Archived' : '📦 Show Archived'}
          </button>
          {filterPresets.length > 0 && (
            <select
              className="form-select form-select-sm"
              style={{ width: 'auto', minWidth: '150px' }}
              value={selectedPresetId}
              onChange={(e) => {
                const value = e.target.value
                setSelectedPresetId(value)
                if (!value) return

                const preset = filterPresets.find(p => String(p.id) === value)
                if (!preset) return

                setSearch(preset.search || '')
                setStatus(preset.status || '')
                setSortBy(preset.sortBy || '')
                setQuickFilter('')
              }}
            >
              <option value="">📌 Filter Presets...</option>
              {filterPresets.map(preset => (
                <option key={preset.id} value={preset.id}>
                  {preset.name}
                </option>
              ))}
            </select>
          )}
          {(
            quickFilter ||
            search ||
            status ||
            selectedPresetId ||
            (sortBy && sortBy !== (settings?.defaultSortBy || 'date'))
          ) && (
            <button
              className="btn btn-sm btn-outline-primary ms-auto"
              onClick={() => {
                setQuickFilter('')
                setSearch('')
                setStatus('')
                setSortBy('')
                setSelectedPresetId('')
              }}
            >
              Clear Filter
            </button>
          )}
        </div>

        <div className="row g-2 mb-3 align-items-center">
          <div className="col-12 col-md-4">
            <input
              ref={searchInputRef}
              type="text"
              className="form-control"
              placeholder="Search tasks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="col-6 col-md-4">
            <select
              className="form-select"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="">All Tasks</option>
              <option value="active">Active</option>
              <option value="inprogress">In Progress</option>
              <option value="onhold">On Hold</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div className="col-6 col-md-4">
            <select
              className="form-select"
              value={effectiveSortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="date">Sort by Recent</option>
              <option value="priority">Sort by Priority</option>
              <option value="title">Sort by Title</option>
              <option value="dueDate">Sort by Due Date</option>
              <option value="custom">Sort by Custom</option>
            </select>
          </div>
        </div>
        <div className="row g-2 mb-3 align-items-center">
          <div className="col-12 d-flex justify-content-between gap-2 flex-wrap align-items-center">
            <h2 className="mb-0">My Tasks</h2>
            <div className="d-flex gap-2 flex-wrap align-items-center">
            {tasks.length > 0 && (
              <>
                {selectedTasks.size === 0 && (
                  <button className="btn btn-outline-primary" style={{ height: '38px', minWidth: '120px' }} onClick={handleSelectAll}>
                    Select All
                  </button>
                )}
                {selectedTasks.size > 0 && selectedTasks.size < tasks.length && (
                  <>
                    <button className="btn btn-outline-primary" style={{ height: '38px', minWidth: '120px' }} onClick={handleSelectAll}>
                      Select All
                    </button>
                    <button className="btn btn-outline-primary" style={{ height: '38px', minWidth: '120px', color: '#fff' }} onClick={handleUnselectAll}>
                      Unselect All
                    </button>
                  </>
                )}
                {selectedTasks.size === tasks.length && tasks.length > 0 && (
                  <button className="btn btn-outline-primary" style={{ height: '38px', minWidth: '120px', color: '#fff' }} onClick={handleUnselectAll}>
                    Unselect All
                  </button>
                )}
              </>
            )}
            <button 
              className="btn btn-primary" 
              style={{ height: '38px', minWidth: '120px' }}
              onClick={handleCreate}
            >
              <span className="d-none d-sm-inline">+ Add Task</span>
              <span className="d-sm-none">+ Add</span>
            </button>
            </div>
          </div>
        </div>

        {selectedTasks.size > 0 && (
          <BulkActionsBar
            selectedCount={selectedTasks.size}
            selectedTasks={selectedTasks}
            tasks={tasks}
            onBulkDelete={handleBulkDelete}
            onBulkStatusChange={handleBulkStatusChange}
            onBulkArchive={handleBulkArchive}
            onBulkUnarchive={handleBulkUnarchive}
            onClear={() => setSelectedTasks(new Set())}
          />
        )}

        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-2 text-muted">Loading tasks...</p>
          </div>
        ) : tasks.length === 0 ? (
          <div className="alert alert-info">
            {search ? 'No tasks match your search.' : 'No tasks found. Create your first task!'}
          </div>
        ) : (
          <div className="row">
            {sortedTasks.map((task, index) => (
              <div
                key={task.id}
                ref={(el) => { if (el) cardRefs.current[task.id] = el }}
                data-task-id={task.id}
                className="col-12 col-md-6 col-lg-4 mb-3"
                draggable
                onDragStart={(e) => handleDragStart(e, task.id)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                style={{
                  opacity: draggedTaskId === task.id ? 0.5 : 1,
                  borderTop: dragOverIndex === index ? '3px solid var(--bs-primary)' : 'none',
                  cursor: 'move'
                }}
              >
                <TaskCard
                  task={task}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onToggleComplete={handleToggleComplete}
                  onDuplicate={handleDuplicate}
                  onArchive={handleArchive}
                  onUnarchive={handleUnarchive}
                  isSelected={selectedTasks.has(task.id)}
                  onSelect={handleSelectTask}
                  uiFields={settings.uiFields}
                  dateFormat={settings.dateFormat}
                  onTimeUpdate={handleTimeUpdate}
                  onFilterByPriority={handleFilterByPriority}
                  onFilterByTag={handleFilterByTag}
                  onFilterByRecurrence={handleFilterByRecurrence}
                  onUpdateStatus={handleUpdateStatus}
                  onScrollToTask={scrollToTaskThenEdit}
                  isHighlighted={highlightedTaskId === task.id}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <TaskModal
        key={editingTask?.id ?? (editingTask ? 'parsed' : 'create')}
        show={showModal}
        onClose={() => {
          setShowModal(false)
          setEditingTask(null)
        }}
        allTasks={allTasks.filter(t => !t.parentTaskId)}
        onSubmit={handleSubmit}
        task={editingTask}
        isEditing={!!editingTask?.id}
        submitting={submitting}
        onSaveAsTemplate={handleSaveAsTemplate}
        onCreateSubtask={handleCreateSubtask}
        onDeleteSubtask={handleDeleteSubtask}
        onReorderSubtasks={handleReorderSubtasks}
        onEditSubtask={handleEdit}
        onToggleCompleteSubtask={handleToggleComplete}
      />

      {/* Template Name Modal */}
      {showTemplateNameModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Save as Template</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => {
                    setShowTemplateNameModal(false)
                    setTemplateNameInput('')
                    setFormDataToSave(null)
                    setSubtasksToSave([])
                  }}
                />
              </div>
              <div className="modal-body">
                <label htmlFor="templateNameInput" className="form-label">
                  Template Name
                </label>
                <input
                  type="text"
                  className="form-control"
                  id="templateNameInput"
                  value={templateNameInput}
                  onChange={(e) => setTemplateNameInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && templateNameInput.trim()) {
                      handleConfirmSaveTemplate()
                    }
                  }}
                  placeholder="Enter template name"
                  autoFocus
                />
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowTemplateNameModal(false)
                    setTemplateNameInput('')
                    setFormDataToSave(null)
                    setSubtasksToSave([])
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleConfirmSaveTemplate}
                  disabled={!templateNameInput?.trim()}
                >
                  Save Template
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Dialog {...dialog} />
    </div>
  )
}

export default Tasks
