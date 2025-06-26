
"use client";
import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Receipt, ShoppingCart } from 'lucide-react';
import EditableHeader from '@/components/EditableHeader';
import AccountingSummary from '@/components/dashboard/AccountingSummary';
import TaxSummary from '@/components/dashboard/TaxSummary';
import { useAppContext } from '@/contexts/AppContext';

export default function DashboardPage() {
  const { settings } = useAppContext();
  
  return (
    <div className="space-y-12">
      {/* Header Section */}
      <div className="rounded-2xl bg-gradient-to-r from-primary to-primary/80 text-primary-foreground p-8 shadow-2xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="text-center md:text-left">
                <h1 className="text-4xl lg:text-5xl font-bold font-headline tracking-tight">{settings.companyName}</h1>
                <p className="text-xl text-primary-foreground/80 mt-2">
                    Welcome back! Here's a snapshot of your business.
                </p>
            </div>
            <div className="flex-shrink-0 flex items-center space-x-4">
                <Link href="/sales" passHref>
                    <Button size="lg" className="shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 active:scale-95 h-14 text-lg rounded-lg px-8 bg-success hover:bg-success/90 text-success-foreground border-2 border-success-foreground/30">
                        <Receipt className="mr-3 h-6 w-6" /> Create Sale
                    </Button>
                </Link>
                <Link href="/purchase" passHref>
                    <Button size="lg" className="shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 active:scale-95 h-14 text-lg rounded-lg px-8 bg-destructive hover:bg-destructive/90 text-destructive-foreground border-2 border-destructive-foreground/30">
                        <ShoppingCart className="mr-3 h-6 w-6" /> Create Purchase
                    </Button>
                </Link>
            </div>
        </div>
      </div>
      
      {/* Today's Prices */}
      <EditableHeader />
      
      {/* Summaries Section */}
      <div className="flex flex-col gap-8">
        <AccountingSummary />
        <TaxSummary />
      </div>
    </div>
  );
}
