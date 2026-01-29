import api from './api'

export const taskHistoryService = {
  getHistory: async (taskId) => {
    const { data } = await api.get(`/tasks/${taskId}/history`)
    return data
  }
}
