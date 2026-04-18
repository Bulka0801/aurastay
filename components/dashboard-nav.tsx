"use client";

import type React from "react";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Calendar,
  DoorOpen,
  BedDouble,
  Wrench,
  DollarSign,
  BarChart3,
  Settings,
  ClipboardList,
  Users,
  TrendingUp,
} from "lucide-react";

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: string[];
}

const navItems: NavItem[] = [
  {
    title: "Дашборд",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  // {
  //   title: "Шахматка",
  //   href: "/dashboard/room-rack", //TO DO
  //   icon: LayoutGrid,
  //   roles: [
  //     "system_admin",
  //     "general_manager",
  //     "front_desk_manager",
  //     "front_desk_agent",
  //     "reservations_manager",
  //     "housekeeping_supervisor",
  //   ],
  // },
  {
    title: "Бронювання",
    href: "/dashboard/reservations",
    icon: Calendar,
    roles: [
      "system_admin",
      "front_desk_manager",
      "front_desk_agent",
      "reservations_manager",
    ],
  },
  {
    title: "Рецепція",
    href: "/dashboard/front-desk",
    icon: DoorOpen,
    roles: ["system_admin", "front_desk_manager", "front_desk_agent"],
  },
  {
    title: "Номери",
    href: "/dashboard/rooms",
    icon: BedDouble,
  },
  {
    title: "Господарська служба",
    href: "/dashboard/housekeeping",
    icon: ClipboardList,
    roles: [
      "system_admin",
      "front_desk_manager",
      "housekeeping_supervisor",
      "housekeeping_staff",
    ],
  },
  {
    title: "Технічне обслуговування",
    href: "/dashboard/maintenance",
    icon: Wrench,
    roles: [
      "system_admin",
      "maintenance_manager",
      "maintenance_staff",
      "housekeeping_supervisor",
    ],
  },
  {
    title: "Гості",
    href: "/dashboard/guests",
    icon: Users,
    roles: [
      "system_admin",
      "general_manager",
      "front_desk_manager",
      "front_desk_agent",
      "reservations_manager",
    ],
  },
  {
    title: "Фінанси",
    href: "/dashboard/finance",
    icon: DollarSign,
    roles: [
      "system_admin",
      "general_manager",
      "accountant",
      "front_desk_manager",
    ],
  },
  {
    title: "Звіти",
    href: "/dashboard/reports",
    icon: BarChart3,
    roles: [
      "system_admin",
      "general_manager",
      "front_desk_manager",
      "revenue_manager",
      "accountant",
    ],
  },
  {
    title: "Продажі та маркетинг",
    href: "/dashboard/sales",
    icon: TrendingUp,
    roles: [
      "system_admin",
      "general_manager",
      "sales_manager",
      "revenue_manager",
    ],
  },
  {
    title: "Адміністрування",
    href: "/dashboard/admin",
    icon: Settings,
    roles: ["system_admin"],
  },
];

interface DashboardNavProps {
  role: string;
}

export function DashboardNav({ role }: DashboardNavProps) {
  const pathname = usePathname();

  const filteredNavItems = navItems.filter(
    (item) => !item.roles || item.roles.includes(role)
  );

  return (
    <aside className="hidden w-64 border-r bg-sidebar md:block">
      <nav className="flex flex-col gap-1 p-4">
        {filteredNavItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.title}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
