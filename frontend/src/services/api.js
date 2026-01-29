import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json'
  }
})

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor for error handling and token refresh
let isRefreshing = false
let failedQueue = []

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve(token)
    }
  })
  failedQueue = []
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    const isAuthEndpoint = originalRequest.url?.includes('/auth/login') || 
                          originalRequest.url?.includes('/auth/register') ||
                          originalRequest.url?.includes('/auth/refresh')

    if (error.response?.status === 401 && !originalRequest._retry) {
      // Don't auto-redirect for auth endpoints - let them handle the error
      if (isAuthEndpoint) {
        // If refresh token failed, clear auth and redirect to login
        if (originalRequest.url?.includes('/auth/refresh')) {
          localStorage.removeItem('token')
          localStorage.removeItem('refreshToken')
          localStorage.removeItem('userId')
          localStorage.removeItem('username')
          window.location.href = '/login'
        }
        return Promise.reject(error)
      }

      // If already refreshing, queue this request
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then(token => {
          originalRequest.headers.Authorization = `Bearer ${token}`
          return api(originalRequest)
        }).catch(err => {
          return Promise.reject(err)
        })
      }

      originalRequest._retry = true
      const refreshToken = localStorage.getItem('refreshToken')

      if (refreshToken) {
        isRefreshing = true
        try {
          const { authService } = await import('./authService')
          const data = await authService.refreshToken(refreshToken)
          localStorage.setItem('token', data.token)
          localStorage.setItem('refreshToken', data.refreshToken)
          processQueue(null, data.token)
          originalRequest.headers.Authorization = `Bearer ${data.token}`
          isRefreshing = false
          return api(originalRequest)
        } catch (refreshError) {
          processQueue(refreshError, null)
          localStorage.removeItem('token')
          localStorage.removeItem('refreshToken')
          localStorage.removeItem('userId')
          localStorage.removeItem('username')
          isRefreshing = false
          window.location.href = '/login'
          return Promise.reject(refreshError)
        }
      } else {
        localStorage.removeItem('token')
        localStorage.removeItem('refreshToken')
        localStorage.removeItem('userId')
        localStorage.removeItem('username')
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default api

