import { useState } from 'react'
import { useTasks } from '../hooks/useTasks'
import { useSettings } from '../hooks/useSettings'
import Navbar from '../components/Navbar'
import TaskCard from '../components/TaskCard'
import TaskModal from '../components/TaskModal'
import { taskService } from '../services/taskService'

function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState('month') // 'month', 'week', 'day'
  const [selectedDate, setSelectedDate] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [editingTask, setEditingTask] = useState(null)
  const { settings } = useSettings()
  
  // Get all tasks (we'll filter by date in the component)
  const { tasks, loading, createTask, updateTask, deleteTask, refreshTasks } = useTasks('', '', '', false)

  const getDaysInMonth = (date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()
    
    const days = []
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null)
    }
    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day))
    }
    return days
  }

  const getTasksForDate = (date) => {
    if (!date) return []
    const dateStr = date.toISOString().split('T')[0]
    return tasks.filter(task => {
      if (!task.dueDate) return false
      const taskDate = new Date(task.dueDate).toISOString().split('T')[0]
      return taskDate === dateStr
    })
  }

  const getWeekDays = (date) => {
    const week = []
    const startOfWeek = new Date(date)
    startOfWeek.setDate(date.getDate() - date.getDay())
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek)
      day.setDate(startOfWeek.getDate() + i)
      week.push(day)
    }
    return week
  }

  const navigateMonth = (direction) => {
    const newDate = new Date(currentDate)
    newDate.setMonth(currentDate.getMonth() + direction)
    setCurrentDate(newDate)
  }

  const navigateWeek = (direction) => {
    const newDate = new Date(currentDate)
    newDate.setDate(currentDate.getDate() + (direction * 7))
    setCurrentDate(newDate)
  }

  const navigateDay = (direction) => {
    const newDate = new Date(currentDate)
    newDate.setDate(currentDate.getDate() + direction)
    setCurrentDate(newDate)
  }

  const handleDateClick = (date) => {
    if (date) {
      setSelectedDate(date)
    }
  }

  const handleTaskClick = (task) => {
    setEditingTask(task)
    setShowModal(true)
  }

  const handleNewTask = (date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const dateStr = `${year}-${month}-${day}T23:59`
    setEditingTask({ dueDate: dateStr })
    setSelectedDate(date)
    setShowModal(true)
  }

  const handleModalClose = () => {
    setShowModal(false)
    setEditingTask(null)
    setSelectedDate(null)
  }

  const formatDate = (date) => {
    const yyyy = date.getFullYear()
    const mm = String(date.getMonth() + 1).padStart(2, '0')
    const dd = String(date.getDate()).padStart(2, '0')
    const fmt = settings?.dateFormat || 'MM/DD/YYYY'
    if (fmt === 'DD/MM/YYYY') return `${dd}/${mm}/${yyyy}`
    if (fmt === 'YYYY-MM-DD') return `${yyyy}-${mm}-${dd}`
    return `${mm}/${dd}/${yyyy}`
  }

  const isToday = (date) => {
    if (!date) return false
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  const isSelected = (date) => {
    if (!date || !selectedDate) return false
    return date.toDateString() === selectedDate.toDateString()
  }

  const monthDays = viewMode === 'month' ? getDaysInMonth(currentDate) : []
  const weekDays = viewMode === 'week' ? getWeekDays(currentDate) : []
  const dayDate = viewMode === 'day' ? currentDate : null

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                     'July', 'August', 'September', 'October', 'November', 'December']

  return (
    <div className="container-main">
      <Navbar />
      <div className="container-fluid p-4">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h2>Calendar View</h2>
          <div className="btn-group" role="group">
            <button
              className={`btn ${viewMode === 'month' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => setViewMode('month')}
            >
              Month
            </button>
            <button
              className={`btn ${viewMode === 'week' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => setViewMode('week')}
            >
              Week
            </button>
            <button
              className={`btn ${viewMode === 'day' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => setViewMode('day')}
            >
              Day
            </button>
          </div>
        </div>

        <div className="card">
          <div className="card-header d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center gap-2">
              <button className="btn btn-sm btn-outline-secondary" onClick={() => {
                if (viewMode === 'month') navigateMonth(-1)
                else if (viewMode === 'week') navigateWeek(-1)
                else navigateDay(-1)
              }}>
                ←
              </button>
              <h5 className="mb-0">
                {viewMode === 'month' && `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`}
                {viewMode === 'week' && `Week of ${formatDate(weekDays[0])}`}
                {viewMode === 'day' && formatDate(currentDate)}
              </h5>
              <button className="btn btn-sm btn-outline-secondary" onClick={() => {
                if (viewMode === 'month') navigateMonth(1)
                else if (viewMode === 'week') navigateWeek(1)
                else navigateDay(1)
              }}>
                →
              </button>
              <button className="btn btn-sm btn-outline-secondary" onClick={() => setCurrentDate(new Date())}>
                Today
              </button>
            </div>
            <button className="btn btn-primary" onClick={() => handleNewTask(selectedDate || currentDate)}>
              + New Task
            </button>
          </div>

          <div className="card-body">
            {viewMode === 'month' && (
              <div className="calendar-month">
                <div className="row g-0 border-bottom">
                  {dayNames.map(day => (
                    <div key={day} className="col text-center p-2 fw-bold border-end">
                      {day}
                    </div>
                  ))}
                </div>
                <div className="row g-0">
                  {monthDays.map((date, idx) => (
                    <div
                      key={idx}
                      className={`col calendar-day border-end border-bottom p-2 ${
                        !date ? 'bg-light' : ''
                      } ${isToday(date) ? 'bg-info bg-opacity-10' : ''} ${
                        isSelected(date) ? 'border-primary border-3' : ''
                      }`}
                      style={{ minHeight: '120px', cursor: date ? 'pointer' : 'default' }}
                      onClick={() => handleDateClick(date)}
                    >
                      {date && (
                        <>
                          <div className="d-flex justify-content-between align-items-center mb-1">
                            <span className={`fw-bold ${isToday(date) ? 'text-primary' : ''}`}>
                              {date.getDate()}
                            </span>
                            <button
                              className="btn btn-sm btn-link p-0"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleNewTask(date)
                              }}
                              title="Add task"
                            >
                              +
                            </button>
                          </div>
                          <div className="task-list" style={{ maxHeight: '80px', overflowY: 'auto' }}>
                            {getTasksForDate(date).slice(0, 3).map(task => (
                              <div
                                key={task.id}
                                className="badge bg-primary mb-1 me-1"
                                style={{ cursor: 'pointer', fontSize: '0.7rem' }}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleTaskClick(task)
                                }}
                                title={task.title}
                              >
                                {task.title.length > 15 ? task.title.substring(0, 15) + '...' : task.title}
                              </div>
                            ))}
                            {getTasksForDate(date).length > 3 && (
                              <div className="text-muted small">
                                +{getTasksForDate(date).length - 3} more
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {viewMode === 'week' && (
              <div className="calendar-week">
                <div className="row g-0 border-bottom">
                  <div className="col-2 border-end p-2 fw-bold">Time</div>
                  {weekDays.map(day => (
                    <div key={day.toISOString()} className="col text-center p-2 fw-bold border-end">
                      <div>{dayNames[day.getDay()]}</div>
                      <div className={isToday(day) ? 'text-primary' : ''}>{day.getDate()}</div>
                    </div>
                  ))}
                </div>
                <div className="row g-0">
                  <div className="col-2 border-end p-2">All Day</div>
                  {weekDays.map(day => (
                    <div
                      key={day.toISOString()}
                      className={`col border-end p-2 ${isToday(day) ? 'bg-info bg-opacity-10' : ''} ${
                        isSelected(day) ? 'border-primary border-3' : ''
                      }`}
                      style={{ minHeight: '200px', cursor: 'pointer' }}
                      onClick={() => handleDateClick(day)}
                    >
                      {getTasksForDate(day).map(task => (
                        <div
                          key={task.id}
                          className="badge bg-primary mb-1 d-block"
                          style={{ cursor: 'pointer' }}
                          onClick={(e) => {
                            e.stopPropagation()
                            handleTaskClick(task)
                          }}
                        >
                          {task.title}
                        </div>
                      ))}
                      <button
                        className="btn btn-sm btn-link p-0 mt-2"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleNewTask(day)
                        }}
                      >
                        + Add Task
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {viewMode === 'day' && (
              <div className="calendar-day-view">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h4>{formatDate(dayDate)}</h4>
                  <button className="btn btn-primary" onClick={() => handleNewTask(dayDate)}>
                    + New Task
                  </button>
                </div>
                <div className="task-list">
                  {loading ? (
                    <div className="text-center p-4">Loading...</div>
                  ) : getTasksForDate(dayDate).length === 0 ? (
                    <div className="text-center p-4 text-muted">No tasks for this day</div>
                  ) : (
                    getTasksForDate(dayDate).map(task => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        onEdit={() => {
                          setEditingTask(task)
                          setShowModal(true)
                        }}
                        onDelete={deleteTask}
                        onToggleComplete={async () => {
                          await updateTask(task.id, { ...task, isCompleted: !task.isCompleted })
                        }}
                        onDuplicate={async () => {
                          const { id, ...taskData } = task
                          await createTask({ 
                            ...taskData, 
                            title: `${taskData.title} (Copy)`,
                            tags: taskData.tags || [],
                            estimatedTimeMinutes: taskData.estimatedTimeMinutes || null
                          })
                        }}
                        onArchive={async () => {
                          await taskService.archive(task.id)
                          refreshTasks()
                        }}
                        onUnarchive={async () => {
                          await taskService.unarchive(task.id)
                          refreshTasks()
                        }}
                        onTimeUpdate={async (taskId, newTime) => {
                          await updateTask(taskId, { ...task, timeSpentSeconds: newTime })
                        }}
                        uiFields={settings.uiFields}
                        dateFormat={settings.dateFormat}
                        allTasks={tasks}
                      />
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showModal && (
        <TaskModal
          show={showModal}
          task={editingTask}
          isEditing={!!editingTask?.id}
          onClose={handleModalClose}
          onSubmit={async (taskData) => {
            if (selectedDate && !taskData.dueDate) {
              taskData.dueDate = selectedDate.toISOString()
            }
            if (editingTask) {
              await updateTask(editingTask.id, taskData)
            } else {
              await createTask(taskData)
            }
            handleModalClose()
          }}
          allTasks={tasks}
        />
      )}
    </div>
  )
}

export default Calendar
