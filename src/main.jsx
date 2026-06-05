import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import LiveView from './LiveView.jsx'

// Helper: Clear local storage and redirect if ?reset=true is in URL
if (window.location.search.includes('reset=true')) {
  localStorage.clear();
  window.location.href = window.location.origin + window.location.pathname;
}

const isLiveView = window.location.search.includes('view=live');

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {isLiveView ? <LiveView /> : <App />}
  </StrictMode>,
)
