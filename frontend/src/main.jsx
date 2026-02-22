import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// Local dev: white bg + black icon; production: black bg + white icon (favicon.svg)
if (import.meta.env.DEV) {
  const link = document.querySelector('link[rel="icon"]')
  if (link) link.href = '/favicon-dev.svg'
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

