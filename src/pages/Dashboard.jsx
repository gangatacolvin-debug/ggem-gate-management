import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { Key, TruckIcon, Users, BarChart3, LogOut, Settings } from 'lucide-react'
import KeyCheckout from '../components/KeyCheckout'
import VehicleOut from '../components/VehicleOut'
import VehicleIn from '../components/VehicleIn'
import VisitorManagement from '../components/VisitorManagement'
import LiveStatus from '../components/LiveStatus'
import CeoVehicle from '../components/CeoVehicle'
import StaffVehicle from '../components/StaffVehicle'
import Reports from '../components/Reports'
import AdminPanel from '../components/AdminPanel'



export default function Dashboard() {
  const navigate = useNavigate()
  const { currentOfficer, isAuthenticated, logout } = useAuthStore()

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login')
    }
  }, [isAuthenticated, navigate])

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  if (!currentOfficer) return null

  const isControlRoom = currentOfficer.role === 'security_control' || currentOfficer.role === 'admin'
  const isGate = currentOfficer.role === 'security_gate' || currentOfficer.role === 'admin'

  const menuItems = []

  // Add Admin Panel for admin and supervisor
if (currentOfficer.role === 'admin' || currentOfficer.role === 'supervisor') {
  menuItems.push({
    title: 'Admin Panel',
    icon: Settings,
    value: 'admin'
  })
}

  if (isControlRoom) {
    menuItems.push({
      title: 'Key Management',
      icon: Key,
      value: 'control-room'
    })
  }

  if (isGate) {
    menuItems.push({
      title: 'Gate Operations',
      icon: TruckIcon,
      value: 'gate'
    })
  }

  if (isGate) {
  menuItems.push({
    title: 'CEO Vehicles',
    icon: TruckIcon,
    value: 'ceo-vehicles'
  })
}

if (isGate) {
  menuItems.push({
    title: 'Staff Vehicles',
    icon: TruckIcon,
    value: 'staff-vehicles'
  })
}

  menuItems.push(
    {
      title: 'Visitors',
      icon: Users,
      value: 'visitors'
    },
    {
      title: 'Live Status',
      icon: BarChart3,
      value: 'status'
    }
  )

  menuItems.push({
  title: 'Reports',
  icon: BarChart3,
  value: 'reports'
})

return (
  <SidebarProvider defaultOpen={true}>
    <div className="flex min-h-screen w-full">
      <Sidebar>
        <SidebarHeader className="border-b px-6 py-4">
          <h2 className="text-lg font-bold">GGEM Gate Management</h2>
          <p className="text-sm text-muted-foreground">{currentOfficer.name}</p>
          <p className="text-xs text-muted-foreground capitalize">
            {currentOfficer.role.replace('_', ' ')}
          </p>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Quick Actions</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {menuItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <a href={`#${item.value}`}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="border-t p-4">
          <Button 
            variant="outline" 
            className="w-full justify-start"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Log Out
          </Button>
        </SidebarFooter>
      </Sidebar>

      <main className="flex-1 overflow-x-hidden">
        <header className="border-b bg-white sticky top-0 z-10">
          <div className="flex h-16 items-center gap-4 px-4 md:px-6">
            <SidebarTrigger className="md:hidden" />
            <h1 className="text-lg md:text-xl font-semibold">Dashboard</h1>
            <div className="ml-auto">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={handleLogout}
                className="md:hidden"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </header>

        <div className="p-4 md:p-6">
          <Tabs defaultValue={isControlRoom ? "control-room" : "gate"} className="space-y-4 md:space-y-6">
            <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${menuItems.length}, 1fr)` }}>
              {isControlRoom && (
                <TabsTrigger value="control-room" className="text-xs md:text-sm">Control Room</TabsTrigger>
              )}
              {isGate && (
                <TabsTrigger value="gate" className="text-xs md:text-sm">Gate</TabsTrigger>
              )}
              {isGate && (
                <TabsTrigger value="ceo-vehicles" className="text-xs md:text-sm">CEO</TabsTrigger>
              )}
              {isGate && (
                <TabsTrigger value="staff-vehicles" className="text-xs md:text-sm">Staff</TabsTrigger>
              )}

              {(currentOfficer.role === 'admin' || currentOfficer.role === 'supervisor') && (
  <TabsTrigger value="admin" className="text-xs md:text-sm">Admin</TabsTrigger>
)}

              
              <TabsTrigger value="visitors" className="text-xs md:text-sm">Visitors</TabsTrigger>
              <TabsTrigger value="status" className="text-xs md:text-sm">Status</TabsTrigger>
              <TabsTrigger value="reports" className="text-xs md:text-sm">Reports</TabsTrigger>
            </TabsList>

{isControlRoom && (
  <TabsContent value="control-room" className="space-y-6">
    <KeyCheckout />
  </TabsContent>
)}

              {isGate && (
  <TabsContent value="gate" className="space-y-6">
    <div className="grid gap-6 md:grid-cols-2">
      <VehicleOut />
      <VehicleIn />
    </div>
  </TabsContent>
)}

{isGate && (
  <TabsContent value="ceo-vehicles" className="space-y-6">
    <CeoVehicle />
  </TabsContent>
)}

{isGate && (
  <TabsContent value="staff-vehicles" className="space-y-6">
    <StaffVehicle />
  </TabsContent>
)}

{(currentOfficer.role === 'admin' || currentOfficer.role === 'supervisor') && (
  <TabsContent value="admin" className="space-y-6">
    <AdminPanel />
  </TabsContent>
)}

<TabsContent value="visitors" className="space-y-6">
  <VisitorManagement />
</TabsContent>

<TabsContent value="status" className="space-y-6">
  <LiveStatus />
</TabsContent>

<TabsContent value="reports" className="space-y-6">
  <Reports />
</TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </SidebarProvider>
  )
}