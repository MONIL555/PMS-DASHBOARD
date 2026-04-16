"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ChevronRight, LayoutDashboard, Users, User, FileText, Briefcase,
  Ticket as TicketIcon, Archive, Building2, Package,
  Link as LinkIcon, Shield, LogOut, User as UserIcon, Bell, Database
} from "lucide-react";

// UI Components
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu,
  SidebarMenuButton, SidebarMenuItem, SidebarMenuSub, SidebarMenuSubButton,
  SidebarMenuSubItem, SidebarRail, useSidebar,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import ThemeToggle from "@/components/ui/theme-toggle";
import { cn } from "@/lib/utils";

// DND Kit Imports
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates,
  verticalListSortingStrategy, useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// Project Specific Imports
import { usePermissions } from "@/hooks/usePermissions";
import { PERMISSIONS } from "@/lib/permissions";
import { logout } from "@/utils/api";

/* ─── NAVIGATION CONFIGURATION (Restored to your actual routes) ──────────── */

export interface NavSubItem {
  id: string;
  name: string;
  href: string;
}

export interface NavItem {
  id: string;
  name: string;
  href?: string;
  icon?: any;
  items?: NavSubItem[];
}

export const DEFAULT_NAVIGATION: NavItem[] = [
  { id: "dashboard", name: "Dashboard", href: "/", icon: LayoutDashboard },
  { id: "leads", name: "Leads", href: "/leads", icon: Users },
  { id: "quotations", name: "Quotations", href: "/quotations", icon: FileText },
  { id: "projects", name: "Projects", href: "/projects", icon: Briefcase },
  { id: "tickets", name: "Tickets", href: "/tickets", icon: TicketIcon },
  { id: "archives", name: "Cancelled Items", href: "/archives", icon: Archive },
  {
    id: "masters",
    name: "Masters",
    icon: Database,
    items: [
      { id: "sub-clients", name: "Clients", href: "/clients" },
      { id: "sub-services", name: "Services", href: "/products" },
      { id: "sub-leadsources", name: "Lead Sources", href: "/lead-sources" },
      { id: "sub-roles", name: "Roles", href: "/roles" },
      { id: "sub-users", name: "Users", href: "/users" },
      { id: "sub-notifications", name: "Notifications", href: "/notifications" },
    ],
  },
];

const STORAGE_KEY = "sidebar-navigation-order";
const SUB_STORAGE_PREFIX = "sidebar-sub-order-";

/* ─── SIDEBAR COMPONENT ──────────────────────────────────────────────────── */

export default function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { open } = useSidebar();
  const pathname = usePathname();
  const router = useRouter();

  // Auth & Permissions
  const { user, hasPermission } = usePermissions();

  const [items, setItems] = React.useState<NavItem[]>(DEFAULT_NAVIGATION);
  const [overrides, setOverrides] = React.useState<any[]>([]);
  const [isMounted, setIsMounted] = React.useState(false);

  const fetchOverridesList = React.useCallback(async () => {
    try {
      const res = await fetch("/api/label-config");
      if (res.ok) {
        const data = await res.json();
        setOverrides(data.overrides || []);
      }
    } catch (err) {
      console.error("Failed to fetch sidebar overrides", err);
    }
  }, []);

  React.useEffect(() => {
    fetchOverridesList();
    const handleUpdate = () => fetchOverridesList();
    window.addEventListener("sidebar-update", handleUpdate);
    return () => window.removeEventListener("sidebar-update", handleUpdate);
  }, [user, fetchOverridesList]);

  React.useEffect(() => {
    let sortedItems = [...DEFAULT_NAVIGATION];

    // 1. Apply Order from localStorage
    const savedOrder = localStorage.getItem(STORAGE_KEY);
    if (savedOrder) {
      try {
        const orderIds = JSON.parse(savedOrder) as string[];
        const ordered = orderIds
          .map((id) => DEFAULT_NAVIGATION.find((item) => item.id === id))
          .filter(Boolean) as NavItem[];

        const missing = DEFAULT_NAVIGATION.filter((item) => !orderIds.includes(item.id));
        sortedItems = [...ordered, ...missing];
      } catch (e) {
        console.error("Failed to parse saved sidebar order", e);
      }
    }

    // 2. Apply sub-item order from localStorage
    sortedItems = sortedItems.map((item) => {
      if (!item.items || item.items.length === 0) return item;
      const savedSubOrder = localStorage.getItem(SUB_STORAGE_PREFIX + item.id);
      if (savedSubOrder) {
        try {
          const subOrderIds = JSON.parse(savedSubOrder) as string[];
          const orderedSubs = subOrderIds
            .map((id) => item.items!.find((sub) => sub.id === id))
            .filter(Boolean) as NavSubItem[];
          const missingSubs = item.items.filter((sub) => !subOrderIds.includes(sub.id));
          return { ...item, items: [...orderedSubs, ...missingSubs] };
        } catch (e) {
          console.error(`Failed to parse saved sub-order for ${item.id}`, e);
        }
      }
      return item;
    });

    // 3. Apply Naming, Overrides, and PERMISSIONS
    const finalItems = sortedItems
      .map((item) => {
        const itemOverride = overrides.find((o) => o.itemId === item.id && !o.subItemHref);
        const newItem = { ...item };

        if (itemOverride?.customName) newItem.name = itemOverride.customName;
        if (itemOverride?.hidden) return null;

        // --- TOP LEVEL PERMISSION FILTERING ---
        if (newItem.href === '/' && !hasPermission(PERMISSIONS.DASHBOARD_VIEW)) return null;
        if (newItem.href === '/leads' && !hasPermission(PERMISSIONS.LEADS_VIEW)) return null;
        if (newItem.href === '/quotations' && !hasPermission(PERMISSIONS.QUOTATIONS_VIEW)) return null;
        if (newItem.href === '/projects' && !hasPermission(PERMISSIONS.PROJECTS_VIEW)) return null;
        if (newItem.href === '/tickets' && !hasPermission(PERMISSIONS.TICKETS_VIEW)) return null;
        if (newItem.href === '/archives' && !hasPermission(PERMISSIONS.ARCHIVES_VIEW)) return null;

        // --- SUB-LEVEL PERMISSION FILTERING ---
        if (newItem.items && newItem.items.length > 0) {
          newItem.items = newItem.items
            .map((sub) => {
              const subOverride = overrides.find((o) => o.itemId === item.id && o.subItemHref === sub.href);
              if (subOverride?.hidden) return null;

              if (sub.href === '/clients' && !hasPermission(PERMISSIONS.CLIENTS_VIEW)) return null;
              if (sub.href === '/products' && !hasPermission(PERMISSIONS.PRODUCTS_VIEW)) return null;
              if (sub.href === '/lead-sources' && !hasPermission(PERMISSIONS.LEAD_SOURCES_VIEW)) return null;
              if (sub.href === '/roles' && !hasPermission(PERMISSIONS.ROLES_VIEW)) return null;
              if (sub.href === '/users' && !hasPermission(PERMISSIONS.USERS_VIEW)) return null;
              if (sub.href === '/notifications' && !hasPermission(PERMISSIONS.NOTIFICATIONS_VIEW)) return null;

              return subOverride?.customName ? { ...sub, name: subOverride.customName } : sub;
            })
            .filter(Boolean) as NavSubItem[];

          // Hide the parent "Masters" category if all its sub-items are hidden due to permissions
          if (newItem.items.length === 0) return null;
        }

        return newItem;
      })
      .filter(Boolean) as NavItem[];

    setItems(finalItems);
    setIsMounted(true);
  }, [overrides, hasPermission]); // Re-run when permissions load

  // Save to localStorage when items change
  React.useEffect(() => {
    if (isMounted) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items.map((i) => i.id)));
    }
  }, [items, isMounted]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setItems((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }

  function handleSubDragEnd(parentId: string, event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setItems((prevItems) => {
      return prevItems.map((item) => {
        if (item.id !== parentId || !item.items) return item;
        const oldIndex = item.items.findIndex((sub) => sub.id === active.id);
        const newIndex = item.items.findIndex((sub) => sub.id === over.id);
        if (oldIndex === -1 || newIndex === -1) return item;

        const newSubs = arrayMove(item.items, oldIndex, newIndex);
        localStorage.setItem(SUB_STORAGE_PREFIX + parentId, JSON.stringify(newSubs.map((s) => s.id)));
        return { ...item, items: newSubs };
      });
    });
  }

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
      router.refresh();
    } catch (err: any) {
      console.error('Logout failed:', err);
      router.push('/login');
    }
  };

  if (!isMounted) return null;

  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <Link
          href="/"
          className={cn("flex items-center gap-2 px-4 py-2 border-b", !open && "justify-center")}
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
            <Briefcase size={22} />
          </div>
          {open && (
            <div className="flex flex-col">
              <span className="font-bold text-xl leading-none tracking-tight text-primary">
                PMS<span className="text-foreground">.ERP</span>
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Project Management
              </span>
            </div>
          )}
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-2 mt-2">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SidebarMenu>
            <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
              {items.map((item) => (
                <SortableNavItem
                  key={item.id}
                  item={item}
                  pathname={pathname}
                  open={open}
                  onSubDragEnd={handleSubDragEnd}
                />
              ))}
            </SortableContext>
          </SidebarMenu>
        </DndContext>
      </SidebarContent>

      <SidebarFooter>
        <div className={cn("flex items-center gap-2 p-2", !open && "flex-col gap-3")}>
          <ThemeToggle />
        </div>

        {/* User Profile Footer */}
        {user && (
          <div className={cn(
            "flex items-center border-t border-border mt-2 p-2",
            open ? "gap-3 justify-between" : "flex-col gap-3 justify-center"
          )}>
            {open && (
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
                  <UserIcon size={18} />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="truncate text-sm font-semibold text-foreground">{user.Name}</span>
                  <span className="truncate text-xs font-medium text-primary">{user.Role_Name}</span>
                </div>
              </div>
            )}
            <button
              onClick={handleLogout}
              title="Log Out"
              className={cn(
                "flex items-center justify-center shrink-0 rounded-md p-2 text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-500",
                !open && "h-10 w-10 bg-secondary/50"
              )}
            >
              <LogOut size={18} />
            </button>
          </div>
        )}
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

/* ─── SORTABLE NAVIGATION COMPONENTS ─────────────────────────────────────── */

function SortableNavItem({
  item,
  pathname,
  open,
  onSubDragEnd,
}: {
  item: NavItem;
  pathname: string;
  open: boolean;
  onSubDragEnd: (parentId: string, event: DragEndEvent) => void;
}) {
  const {
    attributes, listeners, setNodeRef, transform, transition, isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 100 : "auto",
  };

  const subSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const Icon = item.icon;
  const hasSubItems = item?.items && item.items.length > 0;

  // Active state logic to keep parent open if a child route is active
  const isActive = (hasSubItems && item.items?.some(sub => pathname.startsWith(sub.href))) || pathname === item.href;

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {hasSubItems ? (
        <Collapsible asChild defaultOpen={isActive} className="group/collapsible">
          <SidebarMenuItem>
            <CollapsibleTrigger asChild>
              <SidebarMenuButton tooltip={item.name} isActive={isActive}>
                {Icon && <Icon className="h-4 w-4" />}
                <span>{item.name}</span>
                <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
              </SidebarMenuButton>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <DndContext sensors={subSensors} collisionDetection={closestCenter} onDragEnd={(event) => onSubDragEnd(item.id, event)}>
                <SortableContext items={item.items!.map((sub) => sub.id)} strategy={verticalListSortingStrategy}>
                  <SidebarMenuSub>
                    {item.items?.map((subItem) => (
                      <SortableSubNavItem key={subItem.id} subItem={subItem} pathname={pathname} />
                    ))}
                  </SidebarMenuSub>
                </SortableContext>
              </DndContext>
            </CollapsibleContent>
          </SidebarMenuItem>
        </Collapsible>
      ) : (
        <SidebarMenuItem>
          <SidebarMenuButton asChild isActive={pathname === item.href} className="px-3" tooltip={item.name}>
            <Link
              href={item.href || "#"}
              className={cn("flex items-center gap-3 rounded-md", pathname === item.href && "bg-sidebar-accent text-sidebar-accent-foreground")}
            >
              {Icon && <Icon className="h-4 w-4" />}
              {open && <span>{item.name}</span>}
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      )}
    </div>
  );
}

function SortableSubNavItem({ subItem, pathname }: { subItem: NavSubItem; pathname: string }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: subItem.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 100 : "auto",
  };

  return (
    <SidebarMenuSubItem ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <SidebarMenuSubButton asChild isActive={pathname.startsWith(subItem.href)}>
        <Link href={subItem.href}>
          <span>{subItem.name}</span>
        </Link>
      </SidebarMenuSubButton>
    </SidebarMenuSubItem>
  );
}