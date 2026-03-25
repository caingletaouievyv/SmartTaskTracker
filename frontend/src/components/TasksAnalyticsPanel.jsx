/** Task analytics summary card (Tasks page). */
export default function TasksAnalyticsPanel({ analytics, onClose }) {
  if (!analytics) return null

  return (
    <div className="mb-3">
      <div className="card">
        <div className="card-header d-flex justify-content-between align-items-center">
          <h5 className="mb-0 fw-bold">📈 Task Analytics</h5>
          <button type="button" className="btn btn-sm btn-close" onClick={onClose} aria-label="Close analytics" />
        </div>
        <div className="card-body">
          <div className="row g-3">
            <div className="col-6 col-md-3">
              <div className="text-center">
                <h3 className="mb-1 fw-bold">{analytics.totalTasks}</h3>
                <small style={{ color: 'inherit', opacity: 0.85, fontWeight: 500 }}>Total Tasks</small>
              </div>
            </div>
            <div className="col-6 col-md-3">
              <div className="text-center">
                <h3 className="mb-1 fw-bold text-primary">{analytics.activeTasks}</h3>
                <small style={{ color: 'inherit', opacity: 0.85, fontWeight: 500 }}>Active</small>
              </div>
            </div>
            <div className="col-6 col-md-3">
              <div className="text-center">
                <h3 className="mb-1 fw-bold text-success">{analytics.completedTasks}</h3>
                <small style={{ color: 'inherit', opacity: 0.85, fontWeight: 500 }}>Completed</small>
              </div>
            </div>
            <div className="col-6 col-md-3">
              <div className="text-center">
                <h3 className="mb-1 fw-bold text-danger">{analytics.overdueTasks}</h3>
                <small style={{ color: 'inherit', opacity: 0.85, fontWeight: 500 }}>Overdue</small>
              </div>
            </div>
            <div className="col-6 col-md-3">
              <div className="text-center">
                <h3 className="mb-1 fw-bold text-warning">{analytics.highPriorityTasks}</h3>
                <small style={{ color: 'inherit', opacity: 0.85, fontWeight: 500 }}>High Priority</small>
              </div>
            </div>
            <div className="col-6 col-md-3">
              <div className="text-center">
                <h3 className="mb-1 fw-bold">{analytics.tasksThisWeek}</h3>
                <small style={{ color: 'inherit', opacity: 0.85, fontWeight: 500 }}>This Week</small>
              </div>
            </div>
            <div className="col-6 col-md-3">
              <div className="text-center">
                <h3 className="mb-1 fw-bold">{analytics.tasksThisMonth}</h3>
                <small style={{ color: 'inherit', opacity: 0.85, fontWeight: 500 }}>This Month</small>
              </div>
            </div>
          </div>
          <div className="mt-3">
            <h6 className="fw-semibold mb-2">By Priority</h6>
            <div className="d-flex flex-wrap gap-2">
              {Object.entries(analytics.tasksByPriority || {}).map(([priority, count]) => (
                <span key={priority} className="badge bg-info fw-semibold">
                  {priority}: {count}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
