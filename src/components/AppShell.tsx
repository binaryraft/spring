
"use client";
import React, { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SidebarProvider, Sidebar, SidebarTrigger, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarContent, SidebarHeader, SidebarInset, SidebarFooter, SidebarSeparator } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { LayoutDashboard, Receipt, ShoppingCart, Settings, Moon, Sun } from 'lucide-react';
import { useAppContext } from '@/contexts/AppContext';
import SettingsPanel from '@/components/SettingsPanel';

const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { settings, toggleTheme } = useAppContext();
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
        { href: '/sales', label: 'Sales', icon: Receipt },
        { href: '/purchase', label: 'Purchases', icon: ShoppingCart },
    ];

    return (
        <SidebarProvider>
            <Sidebar>
                <SidebarHeader className='p-4'>
                    <h2 className="text-2xl font-headline text-sidebar-primary font-bold">Goldsmith</h2>
                </SidebarHeader>
                <SidebarContent>
                    <SidebarMenu>
                        {menuItems.map((item) => (
                            <SidebarMenuItem key={item.href}>
                                <Link href={item.href} passHref>
                                    <SidebarMenuButton isActive={pathname === item.href} tooltip={item.label}>
                                        <item.icon />
                                        <span>{item.label}</span>
                                    </SidebarMenuButton>
                                </Link>
                            </SidebarMenuItem>
                        ))}
                    </SidebarMenu>
                </SidebarContent>
                <SidebarFooter>
                    <SidebarSeparator />
                    <div className="p-2">
                        <SettingsPanel />
                    </div>
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
        </SidebarProvider>
    );
};

export default AppShell;
