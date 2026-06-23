import { createFileRoute, Outlet } from '@tanstack/react-router'
import { Sidebar } from '@/components/sidebar'

export const Route = createFileRoute('/dashboard')({
  component: DashboardLayout,
})

function DashboardLayout() {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="lg:pr-64">
        <Outlet />
      </main>
    </div>
  )
}
