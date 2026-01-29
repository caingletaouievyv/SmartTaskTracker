import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'

function Navbar() {
  const { user, logout } = useAuth()
  const { isDark, toggleTheme } = useTheme()
  const location = useLocation()

  const getActiveButtonClass = (path) => {
    const isActive = location.pathname === path
    return isActive ? 'btn-primary' : 'btn-outline-primary'
  }

  return (
    <nav className={`navbar ${isDark ? 'navbar-dark bg-dark' : 'navbar-light bg-light'}`} style={{ paddingTop: '0.75rem', paddingBottom: '0.75rem' }}>
      <div className="container-fluid">
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center w-100 gap-2 gap-md-3">
          <div className="d-flex align-items-center gap-2 gap-md-3">
          <span className={`navbar-brand mb-0 h1 ${isDark ? 'text-light' : ''}`}>Smart Task Tracker</span>
            <div className="d-flex align-items-center gap-2">
          <Link 
            to="/tasks"
                className={`btn ${getActiveButtonClass('/tasks')}`}
                style={{ minWidth: '80px' }}
          >
            Tasks
          </Link>
          <Link 
            to="/calendar"
                className={`btn ${getActiveButtonClass('/calendar')}`}
                style={{ minWidth: '80px' }}
          >
            Calendar
          </Link>
            </div>
        </div>
        <div className="d-flex align-items-center gap-2">
          <Link 
            to="/settings"
              className={`btn ${getActiveButtonClass('/settings')}`}
            title="Settings"
              style={{ minWidth: '80px' }}
          >
            ⚙️
          </Link>
          <button 
            className="btn btn-outline-primary"
            onClick={toggleTheme}
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              style={{ minWidth: '80px' }}
          >
            {isDark ? '☀️' : '🌙'}
          </button>
            <span className={`${isDark ? 'text-light' : 'text-dark'} d-none d-sm-inline me-2`}>Welcome, {user?.username}</span>
            <button 
              className="btn btn-outline-primary" 
              onClick={logout}
              style={{ minWidth: '80px' }}
            >
            Logout
          </button>
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navbar

