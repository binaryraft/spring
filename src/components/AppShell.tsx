
"use client";
import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SidebarProvider, Sidebar, SidebarTrigger, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarContent, SidebarHeader, SidebarInset, SidebarFooter, SidebarSeparator, useSidebar } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { LayoutDashboard, Settings, Moon, Sun, PanelLeft, Gem, FilePieChart, BadgeIndianRupee, ShoppingBag } from 'lucide-react';
import { useAppContext } from '@/contexts/AppContext';
import { cn } from '@/lib/utils';

// This wrapper ensures its children are only rendered on the client-side,
// preventing SSR hydration errors with components that rely on window/browser APIs.
const ClientOnly: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [hasMounted, setHasMounted] = useState(false);

    useEffect(() => {
        setHasMounted(true);
    }, []);

    if (!hasMounted) {
        return null; // Or a loading skeleton if you prefer
    }

    return <>{children}</>;
};

// This component can use the useSidebar hook because it's wrapped in ClientOnly
const AppShellContent: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { settings, toggleTheme } = useAppContext();
    const { state, toggleSidebar } = useSidebar();
    const pathname = usePathname();

    useEffect(() => {
        if (settings.theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [settings.theme]);

    const menuItems = [
        { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ];
    
    const billingItems = useMemo(() => {
        const items = [
            { href: '/sales', label: 'Sales', icon: BadgeIndianRupee, color: 'text-success' },
        ];
        if (settings.enablePurchase) {
          items.push({ href: '/purchase', label: 'Purchases', icon: ShoppingBag, color: 'text-destructive' });
        }
        if (settings.enableGstReport) {
          items.push({ href: '/gst-report', label: 'GST Report', icon: FilePieChart });
        }
        return items;
    }, [settings.enableGstReport, settings.enablePurchase]);


    return (
        <>
            <Sidebar collapsible="icon">
                <SidebarHeader className={cn(
                    "flex items-center p-4 border-b border-sidebar-border",
                    state === 'expanded' ? 'justify-between' : 'justify-center'
                )}>
                    <Link href="/dashboard" className={cn("flex items-center gap-3", state === 'collapsed' && 'hidden')}>
                        <Gem className="h-8 w-8 text-sidebar-primary shrink-0" />
                        <h2 className="text-2xl font-headline text-sidebar-primary font-bold whitespace-nowrap">
                            Spring
                        </h2>
                    </Link>
                    <Button variant="ghost" size="icon" onClick={toggleSidebar} className="hidden md:flex text-sidebar-foreground hover:text-sidebar-accent-foreground hover:bg-sidebar-accent">
                        <PanelLeft className={cn("transition-transform duration-300 h-5 w-5", state === 'expanded' && "rotate-180")} />
                        <span className="sr-only">Toggle Sidebar</span>
                    </Button>
                </SidebarHeader>

                <SidebarContent>
                    <SidebarMenu>
                        {menuItems.map((item) => (
                            <SidebarMenuItem key={item.href}>
                                <Link href={item.href} passHref>
                                    <SidebarMenuButton isActive={pathname === item.href} tooltip={item.label} className="h-14 text-lg">
                                        <item.icon className="h-7 w-7" />
                                        <span>{item.label}</span>
                                    </SidebarMenuButton>
                                </Link>
                            </SidebarMenuItem>
                        ))}
                    </SidebarMenu>
                    <SidebarSeparator/>
                    <SidebarMenu>
                        {billingItems.map((item) => (
                            <SidebarMenuItem key={item.href}>
                                <Link href={item.href} passHref>
                                    <SidebarMenuButton isActive={pathname === item.href} tooltip={item.label} className="h-14 text-lg">
                                        <item.icon className={cn("h-8 w-8", item.color)} />
                                        <span>{item.label}</span>
                                    </SidebarMenuButton>
                                </Link>
                            </SidebarMenuItem>
                        ))}
                    </SidebarMenu>
                </SidebarContent>

                <SidebarFooter>
                    <SidebarSeparator />
                    <SidebarMenu>
                       <SidebarMenuItem>
                            <Link href="/settings" passHref>
                                <SidebarMenuButton isActive={pathname === '/settings'} tooltip="Settings" className="h-14 text-lg">
                                    <Settings className="h-7 w-7"/>
                                    <span>Settings</span>
                                </SidebarMenuButton>
                            </Link>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarFooter>
            </Sidebar>

            <SidebarInset>
                <header className="flex items-center justify-between p-4 border-b bg-card">
                    <SidebarTrigger className="md:hidden" />
                    <div className="flex-grow"></div>
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={toggleTheme}
                        title={`Switch to ${settings.theme === 'light' ? 'Dark' : 'Light'} Mode`}
                    >
                        {settings.theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
                        <span className="sr-only">Toggle theme</span>
                    </Button>
                </header>
                <main className="flex-grow p-4 md:p-6 lg:p-8 bg-background">
                    {children}
                </main>
            </SidebarInset>
        </>
    );
};

// The main AppShell component now just sets up the provider and client-side wrapper
const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    return (
        <SidebarProvider>
            <ClientOnly>
                <AppShellContent>{children}</AppShellContent>
            </ClientOnly>
        </SidebarProvider>
    );
};

export default AppShell;
