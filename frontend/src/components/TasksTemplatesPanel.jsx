/** Task templates list + use/delete (Tasks page). */
export default function TasksTemplatesPanel({ templates, onClose, onUseTemplate, onDeleteTemplate }) {
  return (
    <div className="mb-3">
      <div className="card">
        <div className="card-header d-flex justify-content-between align-items-center">
          <h5 className="mb-0 fw-bold">📋 Task Templates</h5>
          <button type="button" className="btn btn-sm btn-close" onClick={onClose} aria-label="Close templates" />
        </div>
        <div className="card-body">
          {templates.length === 0 ? (
            <p className="mb-0" style={{ color: 'inherit', opacity: 0.8 }}>
              No templates. Create a task and save it as a template.
            </p>
          ) : (
            <div className="row g-2">
              {templates.map((template) => (
                <div key={template.id} className="col-12 col-md-6 col-lg-4">
                  <div className="card h-100">
                    <div className="card-body">
                      <h6 className="card-title">{template.name}</h6>
                      <p className="card-text small text-muted mb-2">{template.title}</p>
                      <div className="d-flex gap-2">
                        <button type="button" className="btn btn-sm btn-primary flex-fill" onClick={() => onUseTemplate(template)}>
                          Use
                        </button>
                        <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => onDeleteTemplate(template)}>
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
