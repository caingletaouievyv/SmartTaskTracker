import api from './api'

export const reminderService = {
  getReminders: async (hoursAhead = 24) => {
    const { data } = await api.get('/tasks/reminders', { params: { hoursAhead } })
    return data
  }
}
