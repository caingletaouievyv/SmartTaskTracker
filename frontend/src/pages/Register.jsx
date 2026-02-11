import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { authService } from '../services/authService'
import { checkServerUp } from '../services/api'

function Register() {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const pendingRef = useRef(null)
  const { login } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    const onServerBack = async () => {
      if (!pendingRef.current) return
      const { username: u, email: em, password: p } = pendingRef.current
      pendingRef.current = null
      setError('')
      setLoading(true)
      try {
        const data = await authService.register(u, em, p)
        login(data.token, data.refreshToken, data.userId, data.username)
        navigate('/tasks')
      } catch (err) {
        const errorMsg = err.response?.data?.message || err.response?.data?.title || err.response?.data || 'Registration failed.'
        setError(errorMsg)
      } finally {
        setLoading(false)
      }
    }
    window.addEventListener('server-back', onServerBack)
    return () => window.removeEventListener('server-back', onServerBack)
  }, [login, navigate])

  const validateForm = () => {
    if (!username.trim() || !email.trim() || !password.trim()) {
      setError('Please fill in all fields')
      return false
    }
    if (username.length < 3) {
      setError('Username must be at least 3 characters')
      return false
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return false
    }
    if (!email.includes('@')) {
      setError('Please enter a valid email address')
      return false
    }
    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!validateForm()) return

    setLoading(true)
    try {
      if (!(await checkServerUp())) {
        pendingRef.current = { username, email, password }
        setLoading(false)
        return
      }
      const data = await authService.register(username, email, password)
      login(data.token, data.refreshToken, data.userId, data.username)
      navigate('/tasks')
    } catch (err) {
      const errorMsg = err.response?.data?.message || 
                      err.response?.data?.title || 
                      err.response?.data || 
                      'Registration failed. Username or email may already exist.'
      setError(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container-main d-flex align-items-center justify-content-center">
      <div className="card shadow-lg" style={{ width: '400px' }}>
        <div className="card-body p-5">
          <h2 className="card-title text-center mb-4">Register</h2>
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
              <label className="form-label">Email</label>
              <input
                type="email"
                className="form-control"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
              {loading ? 'Registering...' : 'Register'}
            </button>
            <div className="text-center">
              <Link to="/login">Already have an account? Login</Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default Register

