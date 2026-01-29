import api from './api'

export const authService = {
  login: async (username, password) => {
    const { data } = await api.post('/auth/login', { username, password })
    return data
  },

  register: async (username, email, password) => {
    const { data } = await api.post('/auth/register', { username, email, password })
    return data
  },

  refreshToken: async (refreshToken) => {
    const { data } = await api.post('/auth/refresh', { refreshToken })
    return data
  }
}

