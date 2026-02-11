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
    try {
      const createdTask = await taskService.create(taskData)
      await fetchTasks()
      return createdTask
    } catch (error) {
      throw error
    }
  }

  const updateTask = async (id, taskData) => {
    try {
      await taskService.update(id, taskData)
      await fetchTasks()
    } catch (error) {
      throw error
    }
  }

  const deleteTask = async (id) => {
    try {
      await taskService.delete(id)
      await fetchTasks()
    } catch (error) {
      throw error
    }
  }

  const bulkDeleteTasks = async (taskIds) => {
    try {
      await taskService.bulkDelete(taskIds)
      await fetchTasks()
    } catch (error) {
      throw error
    }
  }

  const bulkCompleteTasks = async (taskIds) => {
    try {
      await taskService.bulkComplete(taskIds)
      await fetchTasks()
    } catch (error) {
      throw error
    }
  }

  const archiveTask = async (id) => {
    try {
      await taskService.archive(id)
      await fetchTasks()
    } catch (error) {
      throw error
    }
  }

  const unarchiveTask = async (id) => {
    try {
      await taskService.unarchive(id)
      await fetchTasks()
    } catch (error) {
      throw error
    }
  }

  const createSubtask = async (parentTaskId, subtaskData) => {
    try {
      const createdSubtask = await taskService.createSubtask(parentTaskId, subtaskData)
      await fetchTasks()
      return createdSubtask
    } catch (error) {
      throw error
    }
  }

  return { tasks, loading, createTask, updateTask, deleteTask, bulkDeleteTasks, bulkCompleteTasks, archiveTask, unarchiveTask, createSubtask, refreshTasks: fetchTasks }
}
