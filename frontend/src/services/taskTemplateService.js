import api from './api'

export const taskTemplateService = {
  getAll: async () => {
    const { data } = await api.get('/tasktemplates')
    return data
  },

  getById: async (id) => {
    const { data } = await api.get(`/tasktemplates/${id}`)
    return data
  },

  create: async (template) => {
    const { data } = await api.post('/tasktemplates', template)
    return data
  },

  update: async (id, template) => {
    await api.put(`/tasktemplates/${id}`, template)
  },

  delete: async (id) => {
    await api.delete(`/tasktemplates/${id}`)
  }
}
