import api from './api'

export const tagService = {
  async getAll() {
    const response = await api.get('/tags')
    return response.data
  }
}
