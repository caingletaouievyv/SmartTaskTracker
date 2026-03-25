/**
 * Filter / sort / presets row on Tasks page (ia.md: presentation-only component).
 */
export default function TasksFilterToolbar({
  showArchived,
  onToggleArchived,
  quickFilter,
  onQuickFilter,
  status,
  onStatusChange,
  effectiveSortBy,
  onSortByChange,
  sortBy,
  defaultSortBy,
  search,
  selectedPresetId,
  onPresetIdChange,
  filterPresets,
  onClearFilters,
  onWhatsNext,
}) {
  const showPresetSeparator =
    filterPresets.length > 0 ||
    quickFilter ||
    search ||
    status ||
    selectedPresetId ||
    (sortBy && sortBy !== (defaultSortBy || 'date'))

  const showClearButton =
    quickFilter ||
    search ||
    status ||
    selectedPresetId ||
    (sortBy && sortBy !== (defaultSortBy || 'date'))

  return (
    <div className="d-flex flex-wrap gap-2 mb-3 align-items-center">
      <button
        type="button"
        className={`btn btn-sm ${showArchived ? 'btn-primary' : 'btn-outline-primary'}`}
        onClick={onToggleArchived}
        title={showArchived ? 'Hide archived tasks' : 'Show archived tasks'}
      >
        {showArchived ? '📦 Hide Archived' : '📦 Show Archived'}
      </button>
      <span className="text-muted d-none d-md-inline" aria-hidden>
        |
      </span>
      <span className="d-block d-md-none w-100" style={{ height: 0 }} aria-hidden />
      <button
        type="button"
        className={`btn btn-sm ${quickFilter === 'today' ? 'btn-primary' : 'btn-outline-primary'}`}
        onClick={() => onQuickFilter('today')}
      >
        📅 Today
      </button>
      <button
        type="button"
        className={`btn btn-sm ${quickFilter === 'week' ? 'btn-primary' : 'btn-outline-primary'}`}
        onClick={() => onQuickFilter('week')}
      >
        📆 This Week
      </button>
      <button
        type="button"
        className={`btn btn-sm ${quickFilter === 'high' ? 'btn-primary' : 'btn-outline-primary'}`}
        onClick={() => onQuickFilter('high')}
      >
        🔴 High Priority
      </button>
      <span className="text-muted d-none d-md-inline" aria-hidden>
        |
      </span>
      <span className="d-block d-md-none w-100" style={{ height: 0 }} aria-hidden />
      <select
        className="form-select form-select-sm"
        style={{ width: 'auto', minWidth: '120px' }}
        value={status}
        onChange={(e) => onStatusChange(e.target.value)}
        aria-label="Filter by status"
      >
        <option value="">All Tasks</option>
        <option value="active">Active</option>
        <option value="inprogress">In Progress</option>
        <option value="onhold">On Hold</option>
        <option value="completed">Completed</option>
        <option value="cancelled">Cancelled</option>
      </select>
      <select
        className="form-select form-select-sm"
        style={{ width: 'auto', minWidth: '140px' }}
        value={effectiveSortBy}
        onChange={(e) => onSortByChange(e.target.value)}
        aria-label="Sort by"
      >
        <option value="date">Sort by Recent</option>
        <option value="priority">Sort by Priority</option>
        <option value="title">Sort by Title</option>
        <option value="dueDate">Sort by Due Date</option>
        <option value="custom">Sort by Custom</option>
      </select>
      {showPresetSeparator && <span className="text-muted d-none d-md-inline" aria-hidden>|</span>}
      {filterPresets.length > 0 && (
        <select
          className="form-select form-select-sm"
          style={{ width: 'auto', minWidth: '150px' }}
          value={selectedPresetId}
          onChange={(e) => onPresetIdChange(e.target.value)}
          aria-label="Filter presets"
        >
          <option value="">📌 Filter Presets...</option>
          {filterPresets.map((preset) => (
            <option key={preset.id} value={preset.id}>
              {preset.name}
            </option>
          ))}
        </select>
      )}
      {showClearButton && (
        <button type="button" className="btn btn-sm btn-outline-primary" onClick={onClearFilters}>
          Clear Filter
        </button>
      )}
      <button
        type="button"
        className="btn btn-outline-primary ms-auto"
        style={{ height: '38px', minWidth: '100px' }}
        onClick={onWhatsNext}
        title="Suggested next (priority, due date)"
      >
        What&apos;s next?
      </button>
    </div>
  )
}
