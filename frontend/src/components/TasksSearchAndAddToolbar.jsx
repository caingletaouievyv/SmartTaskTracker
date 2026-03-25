/**
 * Search input + select-all controls + Add Task / Add-from-text (Tasks page).
 */
export default function TasksSearchAndAddToolbar({
  searchInputRef,
  search,
  onSearchChange,
  tasksLength,
  selectedSize,
  onSelectAll,
  onUnselectAll,
  addDropdownRef,
  showAddDropdown,
  onToggleAddDropdown,
  onCreateTask,
  nlInput,
  onNlInputChange,
  nlLoading,
  onAddFromNaturalLanguage,
}) {
  return (
    <div className="d-flex flex-wrap gap-2 mb-3 align-items-center">
      <div className="flex-grow-1 min-w-0" style={{ minWidth: '120px' }}>
        <div className="input-group">
          <span className="input-group-text bg-transparent" aria-hidden title="Semantic search (meaning + keyword)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M12 0l2.5 7.5L22 10l-7.5 2.5L12 20l-2.5-7.5L2 10l7.5-2.5L12 0z" />
            </svg>
          </span>
          <input
            ref={searchInputRef}
            type="text"
            className="form-control border-start-0"
            placeholder="Search by meaning or keyword..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            aria-label="Search by meaning or keyword"
          />
        </div>
      </div>
      <div className="d-flex gap-2 flex-wrap align-items-center">
        {tasksLength > 0 && (
          <>
            {selectedSize === 0 && (
              <button type="button" className="btn btn-outline-primary" style={{ height: '38px', minWidth: '120px' }} onClick={onSelectAll}>
                Select All
              </button>
            )}
            {selectedSize > 0 && selectedSize < tasksLength && (
              <>
                <button type="button" className="btn btn-outline-primary" style={{ height: '38px', minWidth: '120px' }} onClick={onSelectAll}>
                  Select All
                </button>
                <button type="button" className="btn btn-outline-primary" style={{ height: '38px', minWidth: '120px', color: '#fff' }} onClick={onUnselectAll}>
                  Unselect All
                </button>
              </>
            )}
            {selectedSize === tasksLength && tasksLength > 0 && (
              <button type="button" className="btn btn-outline-primary" style={{ height: '38px', minWidth: '120px', color: '#fff' }} onClick={onUnselectAll}>
                Unselect All
              </button>
            )}
          </>
        )}
        <div className="dropdown" ref={addDropdownRef}>
          <div className="btn-group">
            <button type="button" className="btn btn-primary" style={{ height: '38px', minWidth: '100px' }} onClick={onCreateTask}>
              <span className="d-none d-sm-inline">+ Add Task</span>
              <span className="d-sm-none">+ Add</span>
            </button>
            <button
              type="button"
              className="btn btn-primary add-task-ai-toggle"
              style={{ height: '38px', minWidth: '36px' }}
              onClick={() => onToggleAddDropdown(!showAddDropdown)}
              aria-expanded={showAddDropdown}
              aria-haspopup="true"
              aria-label="Add from text (AI)"
              title="Add from text (AI fills the details)"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M12 0l2.5 7.5L22 10l-7.5 2.5L12 20l-2.5-7.5L2 10l7.5-2.5L12 0z" />
              </svg>
            </button>
          </div>
          <div className={`dropdown-menu dropdown-menu-end p-2 ${showAddDropdown ? 'show' : ''}`} style={{ minWidth: '280px' }}>
            <input
              type="text"
              className="form-control form-control-sm mb-2"
              placeholder="e.g. Review report tomorrow afternoon, high priority"
              value={nlInput}
              onChange={(e) => onNlInputChange(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onAddFromNaturalLanguage()}
              disabled={nlLoading}
              aria-label="Describe your task in plain language"
              aria-busy={nlLoading}
              autoFocus
            />
            <button
              type="button"
              className="btn btn-primary btn-sm w-100"
              onClick={onAddFromNaturalLanguage}
              disabled={nlLoading || !nlInput.trim()}
            >
              {nlLoading ? 'Parsing…' : 'Add from text'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
