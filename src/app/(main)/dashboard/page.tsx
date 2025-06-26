
"use client";
import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Receipt, ShoppingCart } from 'lucide-react';
import EditableHeader from '@/components/EditableHeader';
import AccountingSummary from '@/components/dashboard/AccountingSummary';
import TaxSummary from '@/components/dashboard/TaxSummary';

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl lg:text-4xl font-headline text-primary">Dashboard</h1>
          <p className="text-lg text-muted-foreground mt-1">
            Welcome! Here's an overview of your business.
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <Link href="/sales" passHref>
            <Button size="lg" variant="success" className="shadow-md hover:shadow-lg transition-shadow h-12 text-base">
              <Receipt className="mr-2 h-5 w-5" /> Create Sales Bill
            </Button>
          </Link>
          <Link href="/purchase" passHref>
            <Button size="lg" variant="destructive" className="shadow-md hover:shadow-lg transition-shadow h-12 text-base">
              <ShoppingCart className="mr-2 h-5 w-5" /> Create Purchase
            </Button>
          </Link>
        </div>
      </div>
      
      <EditableHeader />
      
      <div className="space-y-8 mt-12">
        <AccountingSummary />
        <TaxSummary />
      </div>
    </div>
  );
}
