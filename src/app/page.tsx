
import { AppProvider } from "@/contexts/AppContext";
import EditableHeader from "@/components/EditableHeader";
import SettingsPanel from "@/components/SettingsPanel";
import BillingTabs from "@/components/BillingTabs";

export default function Home() {
  return (
    <AppProvider>
      <div className="flex flex-col min-h-screen">
        <SettingsPanel /> {/* Positioned fixed, can be anywhere in the tree */}
        <header className="container mx-auto px-4 pt-20 sm:pt-8 md:pt-12 pb-4"> {/* Added padding-top for fixed SettingsPanel button */}
          <h1 className="text-4xl font-headline text-center mb-2 text-primary tracking-tight">
            Goldsmith Buddy
          </h1>
          <p className="text-center text-muted-foreground mb-8 font-body">
            Your one-stop solution for managing jewellery business.
          </p>
          <EditableHeader />
        </header>
        <main className="flex-grow">
          <BillingTabs />
        </main>
        <footer className="text-center p-4 text-sm text-muted-foreground border-t mt-auto">
          © {new Date().getFullYear()} Goldsmith Buddy. All rights reserved.
        </footer>
      </div>
    </AppProvider>
  );
}
