"use client"

import type React from "react"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Calendar,
  BedDouble,
  Wrench,
  DollarSign,
  BarChart3,
  ClipboardList,
  Users,
  House,
  ConciergeBell,
  Hotel,
  HistoryIcon,
} from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar"

interface NavItem {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  roles?: string[]
}

const navItems: NavItem[] = [
  {
    title: "Дашборд",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Шахматка номерів",
    href: "/dashboard/room-rack",
    icon: Calendar,
    roles: ["general_manager", "front_desk_manager", "front_desk_agent"],
  },
  {
    title: "Бронювання",
    href: "/dashboard/reservations",
    icon: House,
    roles: ["general_manager", "front_desk_manager", "front_desk_agent"],
  },
  {
    title: "Рецепція",
    href: "/dashboard/front-desk",
    icon: ConciergeBell,
    roles: ["front_desk_manager", "front_desk_agent"],
  },
  {
    title: "Номерний фонд",
    href: "/dashboard/rooms",
    icon: BedDouble,
    roles: [
      "system_administrator",
      "general_manager",
      "front_desk_manager",
      "front_desk_agent",
      "housekeeping_supervisor",
      "maintenance_staff",
    ],
  },
  {
    title: "Господарська служба",
    href: "/dashboard/housekeeping",
    icon: ClipboardList,
    roles: ["housekeeping_supervisor", "housekeeping_staff"],
  },
  {
    title: "Технічне обслуговування",
    href: "/dashboard/maintenance",
    icon: Wrench,
    roles: ["maintenance_staff", "housekeeping_supervisor"],
  },
  {
    title: "Гості",
    href: "/dashboard/guests",
    icon: Users,
    roles: ["general_manager", "front_desk_manager", "front_desk_agent"],
  },
  {
    title: "Користувачі та ролі",
    href: "/dashboard/admin/users",
    icon: Users,
    roles: ["system_administrator"],
  },
  {
    title: "Налаштування готелю",
    href: "/dashboard/admin/settings",
    icon: BedDouble,
    roles: ["system_administrator"],
  },
  {
    title: "Журнал дій",
    href: "/dashboard/admin/activity",
    icon: HistoryIcon,
    roles: ["system_administrator"],
  },
  {
    title: "Фінанси",
    href: "/dashboard/finance",
    icon: DollarSign,
    roles: ["general_manager", "front_desk_manager", "front_desk_agent"],
  },
  {
    title: "Звіти",
    href: "/dashboard/reports",
    icon: BarChart3,
    roles: ["general_manager", "front_desk_manager", "front_desk_agent"],
  },
]

interface DashboardNavProps {
  role: string
}

export function DashboardNav({ role }: DashboardNavProps) {
  const pathname = usePathname()
  const { isMobile, setOpenMobile } = useSidebar()

  const filteredNavItems = navItems.filter((item) => !item.roles || item.roles.includes(role))

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border p-4 group-data-[collapsible=icon]:p-2">
        <Link
          href="/dashboard"
          aria-label="Перейти на дашборд"
          className="-m-1 flex min-w-0 cursor-pointer items-center gap-3 rounded-lg p-1 transition-colors hover:bg-sidebar-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring group-data-[collapsible=icon]:justify-center"
        >
          <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground transition-colors">
            <Hotel className="size-4" />
          </div>
          <span className="truncate font-semibold group-data-[collapsible=icon]:hidden">AuraStay</span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu className="p-2 group-data-[collapsible=icon]:items-center">
          {filteredNavItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))

            return (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  isActive={isActive}
                  tooltip={item.title}
                  className={cn(
                    "h-10 gap-3 rounded-lg px-3 group-data-[collapsible=icon]:mx-auto",
                    isActive &&
                      "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm hover:bg-sidebar-primary hover:text-sidebar-primary-foreground",
                  )}
                >
                  <Link
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                    onClick={() => {
                      if (isMobile) {
                        setOpenMobile(false)
                      }
                    }}
                  >
                    <Icon className="size-4" />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}
