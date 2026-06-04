import { createAuditLog } from './api'

export interface AuditLog {
  id: string
  action: string
  timestamp: string
  user: string
}

export const logActivity = async (action: string, userName: string = 'Demo User') => {
  const logEntry: AuditLog = {
    id: Math.random().toString(36).substring(2, 9),
    action,
    timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    user: userName
  }

  // Save to local storage for instant sync
  const localLogs = JSON.parse(localStorage.getItem('audit_logs') || '[]')
  localLogs.unshift(logEntry)
  localStorage.setItem('audit_logs', JSON.stringify(localLogs.slice(0, 50)))

  // Custom event to notify Settings page log timeline
  window.dispatchEvent(new Event('audit_log_added'))

  try {
    await createAuditLog(action)
  } catch {
    // Offline / fallback mode
  }
}
