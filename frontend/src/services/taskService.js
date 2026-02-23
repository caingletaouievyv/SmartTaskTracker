import api from './api'

export const taskService = {
  getAll: async (search, status, sortBy, includeArchived = false, dueDate = null, priority = null, tags = null) => {
    const params = {}
    if (search) params.search = search
    if (status) params.status = status
    if (sortBy) params.sortBy = sortBy
    if (includeArchived) params.includeArchived = true
    if (dueDate) params.dueDate = dueDate
    if (priority !== null && priority !== undefined) params.priority = priority
    if (tags) params.tags = tags
    const { data } = await api.get('/tasks', { params })
    return data
  },

  getById: async (id) => {
    const { data } = await api.get(`/tasks/${id}`)
    return data
  },

  create: async (task) => {
    const { data } = await api.post('/tasks', task)
    return data
  },

  update: async (id, task) => {
    await api.put(`/tasks/${id}`, task)
  },

  delete: async (id) => {
    await api.delete(`/tasks/${id}`)
  },

  bulkDelete: async (taskIds) => {
    const { data } = await api.post('/tasks/bulk-delete', { taskIds })
    return data
  },

  bulkComplete: async (taskIds) => {
    const { data } = await api.post('/tasks/bulk-complete', { taskIds })
    return data
  },

  archive: async (id) => {
    await api.post(`/tasks/${id}/archive`)
  },

  unarchive: async (id) => {
    await api.post(`/tasks/${id}/unarchive`)
  },

  importCsv: async (file) => {
    const formData = new FormData()
    formData.append('file', file)
    const { data } = await api.post('/tasks/import-csv', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
    return data
  },

  addDependency: async (taskId, dependsOnTaskId) => {
    await api.post(`/tasks/${taskId}/dependencies`, { dependsOnTaskId })
  },

  removeDependency: async (taskId, dependsOnTaskId) => {
    await api.delete(`/tasks/${taskId}/dependencies/${dependsOnTaskId}`)
  },

  reorder: async (taskIds) => {
    await api.post('/tasks/reorder', { taskIds })
  },

  createSubtask: async (parentTaskId, subtask) => {
    const { data } = await api.post(`/tasks/${parentTaskId}/subtasks`, subtask)
    return data
  },

  getSubtasks: async (parentTaskId) => {
    const { data } = await api.get(`/tasks/${parentTaskId}/subtasks`)
    return data
  },

  search: async (query, topK = null, threshold = null) => {
    const params = { query: query || '' }
    if (topK != null) params.topK = topK
    if (threshold != null) params.threshold = threshold
    const { data } = await api.get('/tasks/search', { params })
    return data
  },

  getAiSuggestions: async (topK = null) => {
    const params = topK != null ? { topK } : {}
    const { data } = await api.get('/tasks/ai-suggestions', { params })
    return data
  },

  getSuggestedTags: async (text, topK = 5) => {
    if (!text?.trim()) return []
    const params = { text: text.trim(), topK }
    const { data } = await api.get('/tasks/suggest-tags', { params })
    return data || []
  },

  parseNaturalLanguage: async (text) => {
    const { data } = await api.post('/tasks/from-natural-language', { text: text || '' })
    return data
  }
}
