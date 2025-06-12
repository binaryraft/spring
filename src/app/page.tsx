
"use client";
import { AppProvider, useAppContext } from "@/contexts/AppContext";
import EditableHeader from "@/components/EditableHeader";
import SettingsPanel from "@/components/SettingsPanel";
import BillingTabs from "@/components/BillingTabs";

function PageContent() {
  const { settings } = useAppContext();

  return (
    <div className="flex flex-col min-h-screen">
      <SettingsPanel /> {/* Positioned fixed, can be anywhere in the tree */}
      <header className="container mx-auto px-4 pt-20 sm:pt-16 md:pt-20 pb-4"> {/* Adjusted padding for fixed SettingsPanel button */}
        <h1 className="text-4xl font-headline text-center mb-2 text-primary tracking-tight">
          {settings.companyName || "Goldsmith Buddy"}
        </h1>
        <p className="text-center text-muted-foreground mb-4 font-body">
          {settings.slogan || "Your one-stop solution for managing jewellery business."}
        </p>
        <EditableHeader /> {/* Market prices will be shown here directly */}
      </header>
      <main className="flex-grow">
        <BillingTabs />
      </main>
      <footer className="text-center p-4 text-sm text-muted-foreground border-t mt-auto">
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
