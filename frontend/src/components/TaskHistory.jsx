import { useState, useEffect } from 'react'
import { taskHistoryService } from '../services/taskHistoryService'

function TaskHistory({ taskId, onClose }) {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchHistory()
  }, [taskId])

  const fetchHistory = async () => {
    try {
      setLoading(true)
      const data = await taskHistoryService.getHistory(taskId)
      setHistory(data)
    } catch (err) {
      console.error('Failed to fetch history:', err)
    } finally {
      setLoading(false)
    }
  }

  const getActionIcon = (action) => {
    switch (action) {
      case 'Created': return '➕'
      case 'Updated': return '✏️'
      case 'Completed': return '✅'
      case 'Uncompleted': return '↩️'
      case 'Deleted': return '🗑️'
      case 'Archived': return '📦'
      case 'Unarchived': return '📤'
      default: return '📝'
    }
  }

  const formatDate = (date) => {
    return new Date(date).toLocaleString()
  }

  return (
    <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={onClose}>
      <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Task History</h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          <div className="modal-body">
            {loading ? (
              <div className="text-center py-3">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              </div>
            ) : history.length === 0 ? (
              <p className="text-muted">No history available for this task.</p>
            ) : (
              <div className="list-group">
                {history.map((item) => (
                  <div key={item.id} className="list-group-item">
                    <div className="d-flex justify-content-between align-items-start">
                      <div>
                        <span className="me-2">{getActionIcon(item.actionName)}</span>
                        <strong>{item.actionName}</strong>
                        {item.details && (
                          <div>
                            <small className="text-muted">{item.details}</small>
                          </div>
                        )}
                      </div>
                      <small className="text-muted">{formatDate(item.timestamp)}</small>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TaskHistory
