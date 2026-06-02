import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import './Layout.css'

export default function Layout() {
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="shell-main">
        <Topbar />
        <div className="shell-content">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
