import { describe, it, expect, vi, beforeEach } from 'vitest'
import { taskService } from '../taskService'
import api from '../api'

vi.mock('../api')

describe('taskService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('getAll returns items from TaskPagedListDto', async () => {
    const items = [{ id: 1, title: 'A' }]
    api.get.mockResolvedValue({
      data: { items, totalCount: 1, page: 1, pageSize: 50, totalPages: 1 }
    })

    const result = await taskService.getAll()

    expect(api.get).toHaveBeenCalledWith('/tasks', { params: {} })
    expect(result).toEqual(items)
  })

  it('getAll returns legacy array response', async () => {
    const arr = [{ id: 2, title: 'B' }]
    api.get.mockResolvedValue({ data: arr })

    const result = await taskService.getAll()

    expect(result).toEqual(arr)
  })

  it('getAll returns empty array for unexpected shape', async () => {
    api.get.mockResolvedValue({ data: {} })

    const result = await taskService.getAll()

    expect(result).toEqual([])
  })
})
