import { BackgroundSVG } from './index.jsx'
import { Sidebar, Topbar } from './Layout.jsx'

export default function AppLayout({ children, title, subtitle }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <BackgroundSVG />
      <Sidebar />
      <div style={{ marginLeft: '240px', flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1 }}>
        <Topbar title={title} subtitle={subtitle} />
        <main style={{ flex: 1, padding: '28px', maxWidth: '1400px', width: '100%' }}>
          {children}
        </main>
      </div>
    </div>
  )
}
