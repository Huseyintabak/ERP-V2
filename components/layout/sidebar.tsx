"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Package,
  Factory,
  FileBarChart,
  Settings,
  LogOut,
  ChevronDown,
  Box,
  PackageOpen,
  PackagePlus,
  ClipboardList,
  CalendarClock,
  Users,
  Boxes,
  Bell,
  UserCheck,
  Building2,
  ShoppingCart,
  ArrowUpDown,
  FileText,
  Radio,
  ScrollText,
  Camera,
  Printer,
} from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useState } from "react";
import { clearPrivateCaches } from '@/lib/utils/pwa-cache';

interface NavItem {
  title: string;
  href?: string;
  icon: any;
  roles?: string[];
  children?: NavItem[];
}

const navItems: NavItem[] = [
  {
    title: "Ana Sayfa",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Yönetici Dashboard",
    href: "/yonetici-dashboard",
    icon: FileBarChart,
    roles: ["yonetici"],
  },
  {
    title: "Planlama Dashboard",
    href: "/planlama-dashboard",
    icon: CalendarClock,
    roles: ["planlama"],
  },
  {
    title: "Depo Dashboard",
    href: "/depo-dashboard",
    icon: Boxes,
    roles: ["depo"],
  },
  {
    title: "Stok Yönetimi",
    icon: Package,
    roles: ["yonetici", "depo"],
    children: [
      { title: "Hammaddeler", href: "/stok/hammaddeler", icon: Box },
      {
        title: "Yarı Mamuller",
        href: "/stok/yari-mamuller",
        icon: PackageOpen,
      },
      {
        title: "Nihai Ürünler",
        href: "/stok/nihai-urunler",
        icon: PackagePlus,
      },
      {
        title: "Stok Hareketleri",
        href: "/stok/hareketler",
        icon: ArrowUpDown,
      },
      {
        title: "Envanter Sayım",
        href: "/stok/envanter-sayim",
        icon: ClipboardList,
      },
    ],
  },
  {
    title: "Üretim",
    icon: Factory,
    roles: ["yonetici", "planlama"],
    children: [
      { title: "Siparişler", href: "/uretim/siparisler", icon: ClipboardList },
      { title: "Üretim Yönetimi", href: "/uretim/yonetim", icon: Factory },
      {
        title: "Yarı Mamul Üretimi",
        href: "/uretim/yarimamul-uretim",
        icon: Package,
      },
      {
        title: "Üretim Planları",
        href: "/uretim/planlar",
        icon: CalendarClock,
      },
      { title: "BOM Yönetimi", href: "/uretim/bom", icon: Boxes },
      { title: "Operatörler", href: "/uretim/operatorler", icon: Users },
    ],
  },
  {
    title: "Depo Zone Yönetimi",
    href: "/depo-zone-yonetimi",
    icon: Building2,
    roles: ["depo", "yonetici"],
  },
  {
    title: "Barkod Tarama & Transfer",
    href: "/depo/barkod-tara",
    icon: Camera,
    roles: ["depo", "yonetici"],
  },
  {
    title: "Barkod Etiket Yazdırma",
    href: "/depo/barkod-etiket",
    icon: Printer,
    roles: ["depo", "yonetici"],
  },
  {
    title: "Kritik Stok Yönetimi",
    href: "/satinalma/kritik-stoklar",
    icon: ShoppingCart,
    roles: ["planlama", "depo", "yonetici"],
  },
  {
    title: "Müşteri Yönetimi",
    href: "/musteriler",
    icon: Users,
    roles: ["yonetici", "planlama"],
  },
  {
    title: "Raporlar",
    href: "/raporlar",
    icon: FileBarChart,
    roles: ["yonetici"],
  },
  {
    title: "Bildirimler",
    href: "/bildirimler",
    icon: Bell,
    roles: ["yonetici", "planlama", "depo"],
  },
  {
    title: "Kullanıcı Yönetimi",
    href: "/kullanicilar",
    icon: UserCheck,
    roles: ["yonetici"],
  },
  {
    title: "Sistem Bakım",
    icon: Settings,
    roles: ["yonetici"],
    children: [
      {
        title: "Bakım Araçları",
        href: "/sistem-bakim/maintenance",
        icon: Settings,
      },
      {
        title: "Excel Hataları",
        href: "/sistem-bakim/excel-errors",
        icon: FileText,
      },
      {
        title: "Audit Logları",
        href: "/sistem-bakim/audit-logs",
        icon: ScrollText,
      },
    ],
  },
  {
    title: "Ayarlar",
    icon: Settings,
    roles: ["yonetici"],
    children: [
      { title: "Sistem Ayarları", href: "/ayarlar", icon: Settings },
      {
        title: "Real-time Broadcast",
        href: "/ayarlar/realtime-broadcast",
        icon: Radio,
      },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [openMenus, setOpenMenus] = useState<string[]>([]);

  const handleLogout = async () => {
    if (!user?.id) {
      logout();
      window.location.href = "/login";
      return;
    }
    await fetch("/api/auth/logout", { method: "POST" });
    await clearPrivateCaches();
    logout();
    window.location.href = "/login";
  };

  const toggleMenu = (title: string) => {
    setOpenMenus((prev) =>
      prev.includes(title) ? prev.filter((t) => t !== title) : [...prev, title],
    );
  };

  const canAccess = (item: NavItem) => {
    if (!item.roles || item.roles.length === 0) return true;
    return item.roles.includes(user?.role || "");
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "yonetici":
        return "👑";
      case "planlama":
        return "📋";
      case "depo":
        return "📦";
      case "operator":
        return "⚙️";
      default:
        return "👤";
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "yonetici":
        return "from-purple-500 to-indigo-600";
      case "planlama":
        return "from-blue-500 to-cyan-600";
      case "depo":
        return "from-orange-500 to-red-600";
      case "operator":
        return "from-green-500 to-emerald-600";
      default:
        return "from-gray-500 to-gray-600";
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "yonetici":
        return "Yönetici";
      case "planlama":
        return "Planlama";
      case "depo":
        return "Depo";
      case "operator":
        return "Operatör";
      default:
        return "Kullanıcı";
    }
  };

  return (
    <div className="flex h-full w-64 flex-col border-r bg-gradient-to-b from-gray-50 to-white shadow-lg">
      {/* Logo */}
      <div className="flex h-16 items-center border-b px-6 bg-white">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">T</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900">Thunder ERP</h1>
        </div>
      </div>

      {/* User Info */}
      <div
        className={`bg-gradient-to-r ${getRoleColor(user?.role || "")} p-4 text-white`}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-lg">
            {getRoleIcon(user?.role || "")}
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold">{user?.name}</p>
            <p className="text-xs text-white/80">{user?.email}</p>
            <p className="text-xs font-medium text-white/90">
              {getRoleLabel(user?.role || "")}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-4">
        {navItems.filter(canAccess).map((item) => {
          const Icon = item.icon;
          const isActive = item.href ? pathname === item.href : false;
          const isOpen = openMenus.includes(item.title);

          if (item.children) {
            return (
              <Collapsible
                key={item.title}
                open={isOpen}
                onOpenChange={() => toggleMenu(item.title)}
              >
                <CollapsibleTrigger className="w-full">
                  <div
                    className={cn(
                      "flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 hover:bg-white/60 hover:shadow-sm",
                      isOpen && "bg-white/80 shadow-sm border border-gray-200",
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "p-1.5 rounded-md transition-colors",
                          isActive
                            ? "bg-blue-100 text-blue-600"
                            : "bg-gray-100 text-gray-600",
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <span
                        className={cn(
                          "transition-colors",
                          isActive
                            ? "text-blue-700 font-semibold"
                            : "text-gray-700",
                        )}
                      >
                        {item.title}
                      </span>
                    </div>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 text-gray-400 transition-transform duration-200",
                        isOpen && "rotate-180",
                      )}
                    />
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-1 space-y-1 pl-6">
                  {item.children.filter(canAccess).map((child) => {
                    const ChildIcon = child.icon;
                    const isChildActive = pathname === child.href;
                    return (
                      <Link
                        key={child.href}
                        href={child.href!}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 hover:bg-white/60 hover:shadow-sm",
                          isChildActive
                            ? "bg-blue-50 text-blue-700 hover:bg-blue-100 border-l-2 border-blue-500 shadow-sm"
                            : "text-gray-600 hover:text-gray-800",
                        )}
                      >
                        <ChildIcon
                          className={cn(
                            "h-4 w-4 transition-colors",
                            isChildActive ? "text-blue-600" : "text-gray-500",
                          )}
                        />
                        <span>{child.title}</span>
                      </Link>
                    );
                  })}
                </CollapsibleContent>
              </Collapsible>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href!}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 hover:bg-white/60 hover:shadow-sm",
                isActive
                  ? "bg-blue-50 text-blue-700 hover:bg-blue-100 border-l-2 border-blue-500 shadow-sm"
                  : "text-gray-600 hover:text-gray-800",
              )}
            >
              <div
                className={cn(
                  "p-1.5 rounded-md transition-colors",
                  isActive
                    ? "bg-blue-100 text-blue-600"
                    : "bg-gray-100 text-gray-600",
                )}
              >
                <Icon className="h-4 w-4" />
              </div>
              <span
                className={cn(
                  "transition-colors",
                  isActive ? "font-semibold" : "",
                )}
              >
                {item.title}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="border-t p-4 bg-white">
        <Button
          variant="ghost"
          className="w-full justify-start text-red-600 hover:bg-red-50 hover:text-red-700 transition-all duration-200 font-medium"
          onClick={handleLogout}
        >
          <div className="p-1 rounded-md bg-red-100 text-red-600 mr-3">
            <LogOut className="h-4 w-4" />
          </div>
          Çıkış Yap
        </Button>
      </div>
    </div>
  );
}
