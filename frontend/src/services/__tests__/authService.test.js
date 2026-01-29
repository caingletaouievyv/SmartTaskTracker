import { describe, it, expect, vi, beforeEach } from 'vitest'
import { authService } from '../authService'
import api from '../api'

vi.mock('../api')

describe('authService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('login calls API with correct data', async () => {
    const mockData = {
      token: 'test-token',
      refreshToken: 'test-refresh',
      userId: 1,
      username: 'testuser'
    }
    api.post.mockResolvedValue({ data: mockData })

    const result = await authService.login('testuser', 'password123')

    expect(api.post).toHaveBeenCalledWith('/auth/login', {
      username: 'testuser',
      password: 'password123'
    })
    expect(result).toEqual(mockData)
  })

  it('register calls API with correct data', async () => {
    const mockData = {
      token: 'test-token',
      refreshToken: 'test-refresh',
      userId: 1,
      username: 'testuser'
    }
    api.post.mockResolvedValue({ data: mockData })

    const result = await authService.register('testuser', 'test@example.com', 'password123')

    expect(api.post).toHaveBeenCalledWith('/auth/register', {
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123'
    })
    expect(result).toEqual(mockData)
  })

  it('refreshToken calls API with refresh token', async () => {
    const mockData = {
      token: 'new-token',
      refreshToken: 'new-refresh',
      userId: 1,
      username: 'testuser'
    }
    api.post.mockResolvedValue({ data: mockData })

    const result = await authService.refreshToken('old-refresh-token')

    expect(api.post).toHaveBeenCalledWith('/auth/refresh', {
      refreshToken: 'old-refresh-token'
    })
    expect(result).toEqual(mockData)
  })
})
