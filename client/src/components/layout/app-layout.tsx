import { ReactNode } from 'react'
import Sidebar from './sidebar'

interface AppLayoutProps {
  children: ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="h-screen flex overflow-hidden bg-background">
      <Sidebar />

      <div className="flex flex-col w-0 flex-1 overflow-hidden md:ml-64">
        <main className="flex-1 relative z-0 overflow-y-auto focus:outline-none bg-gray-50/50">
          <div className="p-8">{children}</div>
        </main>
      </div>
    </div>
  )
}
