import api from './api'

export const settingsService = {
  async get() {
    const response = await api.get('/settings')
    return response.data
  },

  async update(settings) {
    const response = await api.put('/settings', settings)
    return response.data
  }
}
