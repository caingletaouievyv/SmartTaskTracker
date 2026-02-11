import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { authService } from '../services/authService'
import { checkServerUp } from '../services/api'

function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const pendingRef = useRef(null)
  const { login } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    const onServerBack = async () => {
      if (!pendingRef.current) return
      const { username: u, password: p } = pendingRef.current
      pendingRef.current = null
      setError('')
      setLoading(true)
      try {
        const data = await authService.login(u, p)
        login(data.token, data.refreshToken, data.userId, data.username)
        navigate('/tasks')
      } catch (err) {
        const errorMsg = err.response?.data?.message || err.response?.data?.title || err.response?.data || 'Invalid username or password'
        setError(errorMsg)
      } finally {
        setLoading(false)
      }
    }
    window.addEventListener('server-back', onServerBack)
    return () => window.removeEventListener('server-back', onServerBack)
  }, [login, navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!username.trim() || !password.trim()) {
      setError('Please fill in all fields')
      return
    }

    setLoading(true)
    try {
      if (!(await checkServerUp())) {
        pendingRef.current = { username, password }
        setLoading(false)
        return
      }
      const data = await authService.login(username, password)
      login(data.token, data.refreshToken, data.userId, data.username)
      navigate('/tasks')
    } catch (err) {
      const errorMsg = err.response?.data?.message || 
                      err.response?.data?.title || 
                      err.response?.data || 
                      'Invalid username or password'
      setError(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container-main d-flex align-items-center justify-content-center">
      <div className="card shadow-lg" style={{ width: '400px' }}>
        <div className="card-body p-5">
          <h2 className="card-title text-center mb-4">Login</h2>
          {error && <div className="alert alert-danger">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label">Username</label>
              <input
                type="text"
                className="form-control"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            <div className="mb-3">
              <label className="form-label">Password</label>
              <input
                type="password"
                className="form-control"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary w-100 mb-3" disabled={loading}>
              {loading ? 'Logging in...' : 'Login'}
            </button>
            <div className="text-center">
              <Link to="/register">Don't have an account? Register</Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default Login

