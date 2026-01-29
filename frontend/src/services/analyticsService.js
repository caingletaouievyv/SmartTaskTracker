import api from './api'

export const analyticsService = {
  getAnalytics: async () => {
    const { data } = await api.get('/tasks/analytics')
    return data
  }
}
