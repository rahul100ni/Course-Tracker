import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import LiveView from './LiveView.jsx'

const isLiveView = window.location.search.includes('view=live');

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {isLiveView ? <LiveView /> : <App />}
  </StrictMode>,
)
