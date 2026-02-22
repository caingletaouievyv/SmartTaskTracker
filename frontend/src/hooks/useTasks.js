import { useState, useEffect, useRef } from 'react'
import { taskService } from '../services/taskService'

export function useTasks(search = '', status = '', sortBy = '', includeArchived = false, dueDate = null, priority = null, tags = null) {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const fetchRef = useRef(null)

  const fetchTasks = async () => {
    try {
      setLoading(true)
      const trimmed = (search || '').trim()
      if (trimmed) {
        const data = await taskService.search(trimmed)
        setTasks(Array.isArray(data) ? data.map((r) => r.task) : [])
      } else {
        const data = await taskService.getAll(search, status, sortBy, includeArchived, dueDate, priority, tags)
        setTasks(data)
      }
    } catch (err) {
      console.error('Failed to fetch tasks:', err)
    } finally {
      setLoading(false)
    }
  }

  fetchRef.current = fetchTasks
  useEffect(() => {
    fetchTasks()
  }, [search, status, sortBy, includeArchived, dueDate, priority, tags])

  useEffect(() => {
    const onServerBack = () => fetchRef.current?.()
    window.addEventListener('server-back', onServerBack)
    return () => window.removeEventListener('server-back', onServerBack)
  }, [])

  const createTask = async (taskData) => {
    const createdTask = await taskService.create(taskData)
    await fetchTasks()
    return createdTask
  }

  const updateTask = async (id, taskData) => {
    await taskService.update(id, taskData)
    await fetchTasks()
  }

  const deleteTask = async (id) => {
    await taskService.delete(id)
    await fetchTasks()
  }

  const bulkDeleteTasks = async (taskIds) => {
    await taskService.bulkDelete(taskIds)
    await fetchTasks()
  }

  const bulkCompleteTasks = async (taskIds) => {
    await taskService.bulkComplete(taskIds)
    await fetchTasks()
  }

  const archiveTask = async (id) => {
    await taskService.archive(id)
    await fetchTasks()
  }

  const unarchiveTask = async (id) => {
    await taskService.unarchive(id)
    await fetchTasks()
  }

  const createSubtask = async (parentTaskId, subtaskData) => {
    const createdSubtask = await taskService.createSubtask(parentTaskId, subtaskData)
    await fetchTasks()
    return createdSubtask
  }

  return { tasks, loading, createTask, updateTask, deleteTask, bulkDeleteTasks, bulkCompleteTasks, archiveTask, unarchiveTask, createSubtask, refreshTasks: fetchTasks }
}
