
"use client";
import { AppProvider, useAppContext } from "@/contexts/AppContext";
import EditableHeader from "@/components/EditableHeader";
import SettingsPanel from "@/components/SettingsPanel";
import BillingTabs from "@/components/BillingTabs";

function PageContent() {
  const { settings } = useAppContext();

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <SettingsPanel /> {/* Positioned fixed, can be anywhere in the tree */}
      <header className="container mx-auto px-4 pt-20 sm:pt-16 md:pt-20 pb-4 max-w-screen-xl">
        <div className="text-center mb-6 py-6 rounded-lg bg-primary/10 shadow-sm">
          <h1 className="text-6xl font-headline text-primary tracking-tight mb-2">
            {settings.companyName || "Goldsmith Buddy"}
          </h1>
          <p className="text-xl text-muted-foreground font-body italic">
            {settings.slogan || "Your one-stop solution for managing jewellery business."}
          </p>
        </div>
        <EditableHeader />
      </header>
      <main className="flex-grow container mx-auto px-4 max-w-screen-xl">
        <BillingTabs />
      </main>
      <footer className="text-center p-6 text-sm text-muted-foreground border-t mt-auto bg-card">
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
