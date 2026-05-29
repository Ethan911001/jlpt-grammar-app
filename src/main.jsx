import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { scheduleValidation } from './utils/validate.js'

// Validate grammar data on startup and every 30 minutes
scheduleValidation(30 * 60 * 1000)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
