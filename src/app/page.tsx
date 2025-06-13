
"use client";
import React, { useEffect } from 'react';
import { AppProvider, useAppContext } from "@/contexts/AppContext";
import EditableHeader from "@/components/EditableHeader";
import SettingsPanel from "@/components/SettingsPanel";
import BillingTabs from "@/components/BillingTabs";
import { Button } from '@/components/ui/button';
import { Moon, Sun } from 'lucide-react';

function PageContent() {
  const { settings, toggleTheme } = useAppContext();

  useEffect(() => {
    if (settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings.theme]);

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <div className="fixed top-4 right-4 z-50 flex space-x-2">
        <Button
          variant="outline"
          size="icon"
          onClick={toggleTheme}
          className="shadow-lg hover:shadow-xl transition-shadow bg-card hover:bg-muted"
          title={`Switch to ${settings.theme === 'light' ? 'Dark' : 'Light'} Mode`}
        >
          {settings.theme === 'light' ? <Moon className="h-6 w-6" /> : <Sun className="h-6 w-6" />}
          <span className="sr-only">Toggle theme</span>
        </Button>
        <SettingsPanel />
      </div>
      
      {/* Header for company name and market prices - retains centering and max-width */}
      <header className="container mx-auto px-4 pb-4 max-w-screen-xl">
        <div className="text-center mb-8 py-8 rounded-lg bg-primary/10 shadow-md">
          <h1 className="text-5xl lg:text-6xl font-headline text-primary tracking-tight mb-3">
            {settings.companyName || "Goldsmith Buddy"}
          </h1>
          <p className="text-xl lg:text-2xl text-muted-foreground font-body italic">
            {settings.slogan || "Your one-stop solution for managing jewellery business."}
          </p>
        </div>
        <EditableHeader />
      </header>

      {/* Main content for BillingTabs - now uses w-full */}
      <main className="flex-grow w-full px-4 pb-8">
        <BillingTabs />
      </main>

      <footer className="text-center p-6 text-base text-muted-foreground border-t mt-auto bg-card">
        © {new Date().getFullYear()} {settings.companyName || "Goldsmith Buddy"}. All rights reserved.
      </footer>
    </div>
  );
}

export default function Home() {
  return (
    <AppProvider>
      <PageContent />
    </AppProvider>
  );
}
