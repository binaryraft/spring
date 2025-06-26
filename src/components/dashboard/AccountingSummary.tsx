
"use client";
import React, { useState, useMemo } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import StatCard from './StatCard';
import { isToday, isThisMonth, isThisYear } from 'date-fns';
import { ArrowUpRight, ArrowDownLeft, DollarSign, BarChart } from 'lucide-react';

type Period = 'daily' | 'monthly' | 'yearly';

const AccountingSummary: React.FC = () => {
  const { bills, settings } = useAppContext();
  const [period, setPeriod] = useState<Period>('monthly');

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

    const relevantBills = bills.filter(bill => periodFilter(new Date(bill.date)));

    const totalSales = relevantBills
      .filter(bill => bill.type === 'sales-bill')
      .reduce((sum, bill) => sum + bill.totalAmount, 0);

    const totalPurchases = relevantBills
      .filter(bill => bill.type === 'purchase')
      .reduce((sum, bill) => sum + bill.totalAmount, 0);

    const profit = totalSales - totalPurchases;

    return { totalSales, totalPurchases, profit };
  }, [bills, period]);

  const currency = settings.currencySymbol;

  return (
    <Card className="shadow-lg border-border">
      <CardHeader>
        <CardTitle className="flex items-center text-2xl lg:text-3xl font-headline">
          <BarChart className="mr-3 h-7 w-7 text-primary" />
          Accounting Summary
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
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard 
                    title="Total Sales"
                    value={`${currency}${summary.totalSales.toFixed(2)}`}
                    icon={ArrowUpRight}
                    iconColor="text-green-500"
                />
                 <StatCard 
                    title="Total Purchases"
                    value={`${currency}${summary.totalPurchases.toFixed(2)}`}
                    icon={ArrowDownLeft}
                    iconColor="text-red-500"
                />
                 <StatCard 
                    title="Profit"
                    value={`${currency}${summary.profit.toFixed(2)}`}
                    icon={DollarSign}
                    iconColor="text-primary"
                />
             </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default AccountingSummary;
