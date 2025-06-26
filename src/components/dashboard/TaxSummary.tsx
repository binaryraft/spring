
"use client";
import React, { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import StatCard from './StatCard';
import { isToday, isThisMonth, isThisYear } from 'date-fns';
import { Landmark } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

type Period = 'daily' | 'monthly' | 'yearly';

const TaxSummary: React.FC = () => {
  const { bills, settings } = useAppContext();
  const [period, setPeriod] = useState<Period>('monthly');
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const summary = useMemo(() => {
    let periodFilter: (date: Date) => boolean;
    switch (period) {
      case 'daily':
        periodFilter = (date) => isToday(date);
        break;
      case 'monthly':
        periodFilter = (date) => isThisMonth(date);
        break;
      case 'yearly':
        periodFilter = (date) => isThisYear(date);
        break;
      default:
        periodFilter = () => true;
    }

    const relevantSalesBills = bills.filter(bill => bill.type === 'sales-bill' && periodFilter(new Date(bill.date)));

    const totalCgst = relevantSalesBills.reduce((sum, bill) => sum + (bill.cgstAmount || 0), 0);
    const totalSgst = relevantSalesBills.reduce((sum, bill) => sum + (bill.sgstAmount || 0), 0);
    const totalTax = totalCgst + totalSgst;

    return { totalCgst, totalSgst, totalTax };
  }, [bills, period]);

  const currency = settings.currencySymbol;

  const StatCardsSkeleton = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Skeleton className="h-[120px] w-full" />
        <Skeleton className="h-[120px] w-full" />
        <Skeleton className="h-[120px] w-full" />
    </div>
  );

  return (
    <Card className="shadow-lg border-border">
      <CardHeader>
        <CardTitle className="flex items-center text-2xl lg:text-3xl font-headline">
          <Landmark className="mr-3 h-7 w-7 text-primary" />
          Tax Summary (from Sales)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={period} onValueChange={(value) => setPeriod(value as Period)} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6 bg-primary/10">
            <TabsTrigger value="daily">Daily</TabsTrigger>
            <TabsTrigger value="monthly">Monthly</TabsTrigger>
            <TabsTrigger value="yearly">Yearly</TabsTrigger>
          </TabsList>
           <TabsContent value={period} className="mt-4">
             {!isClient ? <StatCardsSkeleton /> : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <StatCard 
                        title={`CGST (${settings.cgstRate}%)`}
                        value={`${currency}${summary.totalCgst.toFixed(2)}`}
                        icon={Landmark}
                        iconColor="text-accent"
                    />
                     <StatCard 
                        title={`SGST (${settings.sgstRate}%)`}
                        value={`${currency}${summary.totalSgst.toFixed(2)}`}
                        icon={Landmark}
                        iconColor="text-accent"
                    />
                     <StatCard 
                        title="Total Tax Collected"
                        value={`${currency}${summary.totalTax.toFixed(2)}`}
                        icon={Landmark}
                        iconColor="text-primary"
                    />
                 </div>
             )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default TaxSummary;
