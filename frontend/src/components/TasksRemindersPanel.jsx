/** Overdue / upcoming reminders card (Tasks page). */
export default function TasksRemindersPanel({ reminders, onClose }) {
  if (!reminders) return null

  const overdue = reminders.overdueTasks || []
  const upcoming = reminders.upcomingTasks || []

  return (
    <div className="mb-3">
      <div className="card">
        <div className="card-header d-flex justify-content-between align-items-center">
          <h5 className="mb-0 fw-bold">📧 Task Reminders</h5>
          <button type="button" className="btn btn-sm btn-close" onClick={onClose} aria-label="Close reminders" />
        </div>
        <div className="card-body">
          {overdue.length === 0 && upcoming.length === 0 ? (
            <p className="mb-0" style={{ color: 'inherit', opacity: 0.8 }}>
              No tasks due in the next 24 hours. Great job!
            </p>
          ) : (
            <>
              {overdue.length > 0 && (
                <div className="mb-3">
                  <h6 className="text-danger fw-bold mb-2">⚠️ Overdue Tasks ({overdue.length})</h6>
                  <div className="list-group">
                    {overdue.map((task) => (
                      <div key={task.id} className="list-group-item">
                        <div className="d-flex justify-content-between align-items-start">
                          <div className="flex-grow-1">
                            <h6 className="mb-1 fw-semibold">{task.title}</h6>
                            <small style={{ color: 'inherit', opacity: 0.85, display: 'block' }}>
                              Due: {new Date(task.dueDate).toLocaleString()}
                              <span className="text-danger fw-semibold"> ({task.hoursUntilDue} hours ago)</span>
                            </small>
                          </div>
                          <span
                            className={`badge ${task.priority === 2 ? 'bg-danger' : task.priority === 1 ? 'bg-warning' : 'bg-info'} ms-2`}
                          >
                            {task.priority === 2 ? 'High' : task.priority === 1 ? 'Medium' : 'Low'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {upcoming.length > 0 && (
                <div>
                  <h6 className="text-warning fw-bold mb-2">⏰ Upcoming Tasks ({upcoming.length})</h6>
                  <div className="list-group">
                    {upcoming.map((task) => (
                      <div key={task.id} className="list-group-item">
                        <div className="d-flex justify-content-between align-items-start">
                          <div className="flex-grow-1">
                            <h6 className="mb-1 fw-semibold">{task.title}</h6>
                            <small style={{ color: 'inherit', opacity: 0.85, display: 'block' }}>
                              Due: {new Date(task.dueDate).toLocaleString()}
                              <span className="text-warning fw-semibold"> (in {task.hoursUntilDue} hours)</span>
                            </small>
                          </div>
                          <span
                            className={`badge ${task.priority === 2 ? 'bg-danger' : task.priority === 1 ? 'bg-warning' : 'bg-info'} ms-2`}
                          >
                            {task.priority === 2 ? 'High' : task.priority === 1 ? 'Medium' : 'Low'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
