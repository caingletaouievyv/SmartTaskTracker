import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '../contexts/ThemeContext'
import { useDialog } from '../hooks/useDialog'
import { settingsService } from '../services/settingsService'
import Navbar from '../components/Navbar'
import Dialog from '../components/Dialog'


export const defaultSettings = {
  defaultPriority: 1,
  defaultRecurrenceType: 0,
  reminderHoursAhead: 24,
  enableNotifications: true,
  dateFormat: 'MM/DD/YYYY',
  defaultSortBy: 'date',
  rememberSortBy: false,
  exportDateFormat: 'MM/DD/YYYY',
  fontSize: 'medium', // small, medium, large
  keyboardShortcuts: {
    newTask: 'n',
    focusSearch: 's',
    focusSearchAlt: '/'
  },
  exportFields: {
    title: true,
    description: true,
    status: true,
    priority: true,
    dueDate: true,
    createdAt: true,
    notes: true,
    tags: true,
    recurrence: true,
    attachment: true,
    timeSpent: true,
    estimatedTime: true
  },
  exportIncludeSubtasks: true,
  uiFields: {
    description: true,
    priority: true,
    recurrence: true,
    notes: true,
    dueDate: true,
    attachment: true
  },
  searchFields: {
    title: true,
    description: true,
    fileName: true
  }
}


function Settings() {
  const navigate = useNavigate()
  const { isDark, accentColor, setAccentColor, accentColors } = useTheme()
  const { dialog, alert, confirm } = useDialog()
  const [settings, setSettings] = useState(defaultSettings)
  const [saved, setSaved] = useState(false)
  const [filterPresets, setFilterPresets] = useState([])
  const [presetName, setPresetName] = useState('')
  const [presetSearch, setPresetSearch] = useState('')
  const [presetStatus, setPresetStatus] = useState('')
  const [presetSortBy, setPresetSortBy] = useState('')

  const loadSettings = async () => {
    try {
      const data = await settingsService.get()
      setSettings({
        ...defaultSettings,
        ...data,
        exportFields: { ...defaultSettings.exportFields, ...(data.exportFields || {}) },
        uiFields: { ...defaultSettings.uiFields, ...(data.uiFields || {}) },
        searchFields: { ...defaultSettings.searchFields, ...(data.searchFields || {}) },
        keyboardShortcuts: { ...defaultSettings.keyboardShortcuts, ...(data.keyboardShortcuts || {}) }
      })
      if (data.filterPresets) {
        setFilterPresets(data.filterPresets)
      }
    } catch (err) {
      console.error('Failed to load settings from API:', err)
    }
  }

  useEffect(() => {
    loadSettings()
  }, [])

  useEffect(() => {
    const onServerBack = () => loadSettings()
    window.addEventListener('server-back', onServerBack)
    return () => window.removeEventListener('server-back', onServerBack)
  }, [])

  const handleSave = async () => {
    try {
      await settingsService.update({
        ...settings,
        theme: isDark ? 'dark' : 'light',
        accentColor: accentColor,
        filterPresets: filterPresets
      })
      setSaved(true)
      setTimeout(() => {
        setSaved(false)
        navigate('/tasks')
      }, 500)
    } catch (err) {
      console.error('Failed to save settings:', err)
      alert('Failed to save settings. Please try again.')
    }
  }

  const handleReset = async () => {
    if (await confirm('Reset all settings to defaults?', 'Reset Settings')) {
      try {
        await settingsService.update({
          ...defaultSettings,
          theme: isDark ? 'dark' : 'light',
          accentColor: accentColor,
          filterPresets: []
        })
        setSettings(defaultSettings)
        setFilterPresets([])
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      } catch (err) {
        console.error('Failed to reset settings:', err)
        alert('Failed to reset settings. Please try again.')
      }
    }
  }

  const handleSavePreset = async () => {
    if (!presetName.trim()) {
      await alert('Please enter a preset name', 'Validation Error')
      return
    }
    
    const newPreset = {
      id: Date.now(),
      name: presetName.trim(),
      search: presetSearch,
      status: presetStatus,
      sortBy: presetSortBy
    }
    
    const updated = [...filterPresets, newPreset]
    setFilterPresets(updated)
    try {
      await settingsService.update({
        ...settings,
        theme: isDark ? 'dark' : 'light',
        accentColor: accentColor,
        filterPresets: updated
      })
      setPresetName('')
      setPresetSearch('')
      setPresetStatus('')
      setPresetSortBy('')
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      console.error('Failed to save filter preset:', err)
      alert('Failed to save filter preset. Please try again.')
    }
  }

  const handleDeletePreset = async (id) => {
    if (await confirm('Delete this filter preset?', 'Delete Preset')) {
      const updated = filterPresets.filter(p => p.id !== id)
      setFilterPresets(updated)
      try {
        await settingsService.update({
          ...settings,
          theme: isDark ? 'dark' : 'light',
          accentColor: accentColor,
          filterPresets: updated
        })
      } catch (err) {
        console.error('Failed to delete filter preset:', err)
        alert('Failed to delete filter preset. Please try again.')
      }
    }
  }

  return (
    <div className="container-main">
      <Navbar />
      <div className="container mt-3 mt-md-4 px-3 px-md-0">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h2>Settings</h2>
          <button className="btn btn-outline-secondary" onClick={() => navigate('/tasks')}>
            ← Back to Tasks
          </button>
        </div>

        <div className="card">
          <div className="card-header">
            <h5 className="mb-0">Task Defaults</h5>
          </div>
          <div className="card-body">
            <div className="mb-3">
              <label className="form-label">Default Priority</label>
              <select
                className="form-select"
                value={settings.defaultPriority}
                onChange={(e) => setSettings({ ...settings, defaultPriority: parseInt(e.target.value) })}
              >
                <option value={0}>Low</option>
                <option value={1}>Medium</option>
                <option value={2}>High</option>
              </select>
            </div>


            <div className="mb-3">
              <label className="form-label">Default Recurrence</label>
              <select
                className="form-select"
                value={settings.defaultRecurrenceType}
                onChange={(e) => setSettings({ ...settings, defaultRecurrenceType: parseInt(e.target.value) })}
              >
                <option value={0}>None</option>
                <option value={1}>Daily</option>
                <option value={2}>Weekly</option>
                <option value={3}>Monthly</option>
              </select>
            </div>
          </div>
        </div>

        <div className="card mt-3">
          <div className="card-header">
            <h5 className="mb-0">Reminders</h5>
          </div>
          <div className="card-body">
            <div className="mb-3">
              <label className="form-label">Reminder Hours Ahead</label>
              <input
                type="number"
                className="form-control"
                min="1"
                max="168"
                value={settings.reminderHoursAhead}
                onChange={(e) => setSettings({ ...settings, reminderHoursAhead: parseInt(e.target.value) || 24 })}
              />
              <small className="text-muted">How many hours ahead to show upcoming task reminders (1-168)</small>
            </div>
            <div className="form-check">
              <input
                className="form-check-input"
                type="checkbox"
                checked={settings.enableNotifications}
                onChange={(e) => setSettings({ ...settings, enableNotifications: e.target.checked })}
              />
              <label className="form-check-label">Enable Browser Notifications</label>
              <small className="text-muted d-block">Show browser notifications for overdue and upcoming tasks</small>
            </div>
          </div>
        </div>

        <div className="card mt-3">
          <div className="card-header">
            <h5 className="mb-0">Keyboard Shortcuts</h5>
          </div>
          <div className="card-body">
            <div className="mb-3">
              <label className="form-label">New Task</label>
              <input
                type="text"
                className="form-control"
                maxLength="1"
                value={settings.keyboardShortcuts.newTask}
                onChange={(e) => setSettings({
                  ...settings,
                  keyboardShortcuts: { ...settings.keyboardShortcuts, newTask: e.target.value.toLowerCase() }
                })}
              />
              <small className="text-muted">Single key to open new task modal (default: n)</small>
            </div>

            <div className="mb-3">
              <label className="form-label">Focus Search</label>
              <input
                type="text"
                className="form-control"
                maxLength="1"
                value={settings.keyboardShortcuts.focusSearch}
                onChange={(e) => setSettings({
                  ...settings,
                  keyboardShortcuts: { ...settings.keyboardShortcuts, focusSearch: e.target.value.toLowerCase() }
                })}
              />
              <small className="text-muted">Single key to focus search input (default: s)</small>
            </div>

            <div className="mb-3">
              <label className="form-label">Focus Search (Alt)</label>
              <input
                type="text"
                className="form-control"
                maxLength="1"
                value={settings.keyboardShortcuts.focusSearchAlt}
                onChange={(e) => setSettings({
                  ...settings,
                  keyboardShortcuts: { ...settings.keyboardShortcuts, focusSearchAlt: e.target.value.toLowerCase() }
                })}
              />
              <small className="text-muted">Alternative key for focus search (default: /)</small>
            </div>
          </div>
        </div>

        <div className="card mt-3">
          <div className="card-header">
            <h5 className="mb-0">Display Preferences</h5>
          </div>
          <div className="card-body">
            <div className="mb-3">
              <label className="form-label">Accent Color</label>
              <div className="d-flex flex-wrap gap-2">
                {Object.entries(accentColors).map(([key, color]) => (
                  <button
                    key={key}
                    type="button"
                    className={`btn ${accentColor === key ? 'btn-primary' : 'btn-outline-primary'}`}
                    style={accentColor === key ? {} : { borderColor: color.primary, color: color.primary }}
                    onClick={() => setAccentColor(key)}
                    title={color.name}
                  >
                    <span
                      style={{
                        display: 'inline-block',
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        backgroundColor: color.primary,
                        marginRight: '5px'
                      }}
                    ></span>
                    {color.name}
                  </button>
                ))}
              </div>
              <small className="text-muted">Choose accent color for buttons and highlights</small>
            </div>

            <div className="mb-3">
              <label className="form-label">Font Size</label>
              <select
                className="form-select"
                value={settings.fontSize}
                onChange={(e) => setSettings({ ...settings, fontSize: e.target.value })}
              >
                <option value="small">Small</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
              </select>
              <small className="text-muted">Adjust text size for better readability</small>
            </div>

            <div className="mb-3">
              <label className="form-label">Date Format</label>
              <select
                className="form-select"
                value={settings.dateFormat}
                onChange={(e) => setSettings({ ...settings, dateFormat: e.target.value })}
              >
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
              </select>
            </div>

            <div className="mb-3">
              <label className="form-label">Default Sort Order</label>
              <select
                className="form-select"
                value={settings.defaultSortBy}
                onChange={(e) => setSettings({ ...settings, defaultSortBy: e.target.value })}
              >
                <option value="date">Recent (Newest First)</option>
                <option value="priority">Priority</option>
                <option value="title">Title</option>
                <option value="dueDate">Due Date</option>
                <option value="custom">Custom Order</option>
              </select>
            </div>

            <div className="mb-3">
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="checkbox"
                  checked={settings.rememberSortBy}
                  onChange={(e) => setSettings({ ...settings, rememberSortBy: e.target.checked })}
                />
                <label className="form-check-label">Remember Last Sort Order</label>
              </div>
              <small className="text-muted">Save and restore the last sort order you used</small>
            </div>
          </div>
        </div>

        <div className="card mt-3">
          <div className="card-header">
            <h5 className="mb-0">UI Customization</h5>
          </div>
          <div className="card-body">
            <div className="mb-3">
              <label className="form-label">Show/Hide Task Card Fields</label>
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="checkbox"
                  checked={settings.uiFields.description}
                  onChange={(e) => setSettings({
                    ...settings,
                    uiFields: { ...settings.uiFields, description: e.target.checked }
                  })}
                />
                <label className="form-check-label">Description</label>
              </div>
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="checkbox"
                  checked={settings.uiFields.priority}
                  onChange={(e) => setSettings({
                    ...settings,
                    uiFields: { ...settings.uiFields, priority: e.target.checked }
                  })}
                />
                <label className="form-check-label">Priority Badge</label>
              </div>
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="checkbox"
                  checked={settings.uiFields.recurrence}
                  onChange={(e) => setSettings({
                    ...settings,
                    uiFields: { ...settings.uiFields, recurrence: e.target.checked }
                  })}
                />
                <label className="form-check-label">Recurrence Badge</label>
              </div>
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="checkbox"
                  checked={settings.uiFields.notes}
                  onChange={(e) => setSettings({
                    ...settings,
                    uiFields: { ...settings.uiFields, notes: e.target.checked }
                  })}
                />
                <label className="form-check-label">Notes</label>
              </div>
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="checkbox"
                  checked={settings.uiFields.dueDate}
                  onChange={(e) => setSettings({
                    ...settings,
                    uiFields: { ...settings.uiFields, dueDate: e.target.checked }
                  })}
                />
                <label className="form-check-label">Due Date</label>
              </div>
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="checkbox"
                  checked={settings.uiFields.attachment}
                  onChange={(e) => setSettings({
                    ...settings,
                    uiFields: { ...settings.uiFields, attachment: e.target.checked }
                  })}
                />
                <label className="form-check-label">File Attachment</label>
              </div>
            </div>
          </div>
        </div>

        <div className="card mt-3">
          <div className="card-header">
            <h5 className="mb-0">Search Configuration</h5>
          </div>
          <div className="card-body">
            <div className="mb-3">
              <label className="form-label">Enable/Disable Search Fields</label>
              <small className="text-muted d-block mb-2">Select which fields to include in search</small>
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="checkbox"
                  checked={settings.searchFields.title}
                  onChange={(e) => setSettings({
                    ...settings,
                    searchFields: { ...settings.searchFields, title: e.target.checked }
                  })}
                />
                <label className="form-check-label">Title</label>
              </div>
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="checkbox"
                  checked={settings.searchFields.description}
                  onChange={(e) => setSettings({
                    ...settings,
                    searchFields: { ...settings.searchFields, description: e.target.checked }
                  })}
                />
                <label className="form-check-label">Description</label>
              </div>
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="checkbox"
                  checked={settings.searchFields.fileName}
                  onChange={(e) => setSettings({
                    ...settings,
                    searchFields: { ...settings.searchFields, fileName: e.target.checked }
                  })}
                />
                <label className="form-check-label">File Name</label>
              </div>
            </div>
          </div>
        </div>

        <div className="card mt-3">
          <div className="card-header">
            <h5 className="mb-0">Export Settings</h5>
          </div>
          <div className="card-body">
            <div className="mb-3">
              <label className="form-label">CSV Date Format</label>
              <select
                className="form-select"
                value={settings.exportDateFormat}
                onChange={(e) => setSettings({ ...settings, exportDateFormat: e.target.value })}
              >
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                <option value="ISO">ISO (YYYY-MM-DDTHH:mm:ss)</option>
              </select>
              <small className="text-muted">Date format used in exported CSV files</small>
            </div>

            <div className="mb-3">
              <label className="form-label">CSV Fields to Include</label>
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="checkbox"
                  checked={settings.exportFields.title}
                  onChange={(e) => setSettings({
                    ...settings,
                    exportFields: { ...settings.exportFields, title: e.target.checked }
                  })}
                />
                <label className="form-check-label">Title</label>
              </div>
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="checkbox"
                  checked={settings.exportFields.description}
                  onChange={(e) => setSettings({
                    ...settings,
                    exportFields: { ...settings.exportFields, description: e.target.checked }
                  })}
                />
                <label className="form-check-label">Description</label>
              </div>
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="checkbox"
                  checked={settings.exportFields.status}
                  onChange={(e) => setSettings({
                    ...settings,
                    exportFields: { ...settings.exportFields, status: e.target.checked }
                  })}
                />
                <label className="form-check-label">Status</label>
              </div>
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="checkbox"
                  checked={settings.exportFields.priority}
                  onChange={(e) => setSettings({
                    ...settings,
                    exportFields: { ...settings.exportFields, priority: e.target.checked }
                  })}
                />
                <label className="form-check-label">Priority</label>
              </div>
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="checkbox"
                  checked={settings.exportFields.dueDate}
                  onChange={(e) => setSettings({
                    ...settings,
                    exportFields: { ...settings.exportFields, dueDate: e.target.checked }
                  })}
                />
                <label className="form-check-label">Due Date</label>
              </div>
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="checkbox"
                  checked={settings.exportFields.createdAt}
                  onChange={(e) => setSettings({
                    ...settings,
                    exportFields: { ...settings.exportFields, createdAt: e.target.checked }
                  })}
                />
                <label className="form-check-label">Created At</label>
              </div>
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="checkbox"
                  checked={settings.exportFields.notes}
                  onChange={(e) => setSettings({
                    ...settings,
                    exportFields: { ...settings.exportFields, notes: e.target.checked }
                  })}
                />
                <label className="form-check-label">Notes</label>
              </div>
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="checkbox"
                  checked={settings.exportFields.tags}
                  onChange={(e) => setSettings({
                    ...settings,
                    exportFields: { ...settings.exportFields, tags: e.target.checked }
                  })}
                />
                <label className="form-check-label">Tags</label>
              </div>
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="checkbox"
                  checked={settings.exportFields.recurrence}
                  onChange={(e) => setSettings({
                    ...settings,
                    exportFields: { ...settings.exportFields, recurrence: e.target.checked }
                  })}
                />
                <label className="form-check-label">Recurrence</label>
              </div>
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="checkbox"
                  checked={settings.exportFields.attachment}
                  onChange={(e) => setSettings({
                    ...settings,
                    exportFields: { ...settings.exportFields, attachment: e.target.checked }
                  })}
                />
                <label className="form-check-label">Attachment</label>
              </div>
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="checkbox"
                  checked={settings.exportFields.timeSpent}
                  onChange={(e) => setSettings({
                    ...settings,
                    exportFields: { ...settings.exportFields, timeSpent: e.target.checked }
                  })}
                />
                <label className="form-check-label">Time Spent</label>
              </div>
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="checkbox"
                  checked={settings.exportFields.estimatedTime}
                  onChange={(e) => setSettings({
                    ...settings,
                    exportFields: { ...settings.exportFields, estimatedTime: e.target.checked }
                  })}
                />
                <label className="form-check-label">Estimated Time</label>
              </div>
            </div>
            
            <div className="mb-3">
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="checkbox"
                  checked={settings.exportIncludeSubtasks !== false}
                  onChange={(e) => setSettings({
                    ...settings,
                    exportIncludeSubtasks: e.target.checked
                  })}
                />
                <label className="form-check-label">Include Subtasks in Export</label>
                <small className="text-muted d-block">When enabled, subtasks are exported as separate rows with a "Parent Task" column</small>
              </div>
            </div>
          </div>
        </div>

        <div className="card mt-3">
          <div className="card-header">
            <h5 className="mb-0">Filter Presets</h5>
          </div>
          <div className="card-body">
            <div className="mb-3">
              <label className="form-label">Save Current Filter as Preset</label>
              <div className="row g-2 mb-2">
                <div className="col-12 col-md-4">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Preset name"
                    value={presetName}
                    onChange={(e) => setPresetName(e.target.value)}
                  />
                </div>
                <div className="col-6 col-md-2">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Search"
                    value={presetSearch}
                    onChange={(e) => setPresetSearch(e.target.value)}
                  />
                </div>
                <div className="col-6 col-md-2">
                  <select
                    className="form-select"
                    value={presetStatus}
                    onChange={(e) => setPresetStatus(e.target.value)}
                  >
                    <option value="">All</option>
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
                <div className="col-6 col-md-2">
                  <select
                    className="form-select"
                    value={presetSortBy}
                    onChange={(e) => setPresetSortBy(e.target.value)}
                  >
                    <option value="">Date</option>
                    <option value="priority">Priority</option>
                    <option value="title">Title</option>
                    <option value="dueDate">Due Date</option>
                  </select>
                </div>
                <div className="col-6 col-md-2">
                  <button className="btn btn-primary w-100" onClick={handleSavePreset}>
                    Save
                  </button>
                </div>
              </div>
            </div>

            {filterPresets.length > 0 && (
              <div>
                <label className="form-label">Saved Presets</label>
                <div className="list-group">
                  {filterPresets.map(preset => (
                    <div key={preset.id} className="list-group-item d-flex justify-content-between align-items-center">
                      <div>
                        <strong>{preset.name}</strong>
                        <small className="text-muted ms-2">
                          {preset.search && `Search: ${preset.search}`}
                          {preset.status && ` | Status: ${preset.status}`}
                          {preset.sortBy && ` | Sort: ${preset.sortBy}`}
                        </small>
                      </div>
                      <button
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => handleDeletePreset(preset.id)}
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 d-flex gap-2">
          <button className="btn btn-primary" onClick={handleSave}>
            {saved ? '✓ Saved!' : 'Save Settings'}
          </button>
          <button className="btn btn-outline-secondary" onClick={handleReset}>
            Reset to Defaults
          </button>
        </div>

        <Dialog {...dialog} />
      </div>
    </div>
  )
}

export default Settings
