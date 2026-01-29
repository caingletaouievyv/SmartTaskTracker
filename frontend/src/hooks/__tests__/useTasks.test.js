import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useTasks } from '../useTasks'
import { taskService } from '../../services/taskService'

vi.mock('../../services/taskService', () => ({
  taskService: {
    getAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  }
}))

describe('useTasks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches tasks on mount', async () => {
    const mockTasks = [{ id: 1, title: 'Task 1' }]
    taskService.getAll.mockResolvedValue(mockTasks)

    const { result } = renderHook(() => useTasks())

    expect(result.current.loading).toBe(true)
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.tasks).toEqual(mockTasks)
  })

  it('createTask creates and refreshes', async () => {
    const mockTask = { id: 1, title: 'New Task' }
    taskService.getAll.mockResolvedValue([])
    taskService.create.mockResolvedValue(mockTask)

    const { result } = renderHook(() => useTasks())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await result.current.createTask({ title: 'New Task' })

    expect(taskService.create).toHaveBeenCalledWith({ title: 'New Task' })
  })

  it('updateTask updates and refreshes', async () => {
    taskService.getAll.mockResolvedValue([])
    taskService.update.mockResolvedValue()

    const { result } = renderHook(() => useTasks())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await result.current.updateTask(1, { title: 'Updated' })

    expect(taskService.update).toHaveBeenCalledWith(1, { title: 'Updated' })
  })

  it('deleteTask deletes and refreshes', async () => {
    taskService.getAll.mockResolvedValue([])
    taskService.delete.mockResolvedValue()

    const { result } = renderHook(() => useTasks())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await result.current.deleteTask(1)

    expect(taskService.delete).toHaveBeenCalledWith(1)
  })
})
