
"use client";
import React, { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DatePicker } from '@/components/ui/date-picker';
import GstReportTable from '@/components/reports/GstReportTable';
import { FilePieChart, Printer } from 'lucide-react';
import { startOfMonth, endOfMonth, startOfYear, endOfYear, getYear, getMonth, setYear, setMonth, format, isWithinInterval } from 'date-fns';
import type { Bill } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';

type PeriodType = 'monthly' | 'yearly' | 'custom';

const GstReportPage = () => {
    const { bills, settings } = useAppContext();
    const [periodType, setPeriodType] = useState<PeriodType>('monthly');

    const [selectedMonth, setSelectedMonth] = useState<number>();
    const [selectedYear, setSelectedYear] = useState<number>();
    const [customStartDate, setCustomStartDate] = useState<Date | undefined>();
    const [customEndDate, setCustomEndDate] = useState<Date | undefined>();
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        const now = new Date();
        setSelectedMonth(getMonth(now));
        setSelectedYear(getYear(now));
        setCustomStartDate(startOfMonth(now));
        setCustomEndDate(endOfMonth(now));
        setIsClient(true);
    }, []);

    const years = useMemo(() => {
        const currentYear = getYear(new Date());
        const uniqueYears = [...new Set(bills.map(b => getYear(new Date(b.date))))];
        if (!uniqueYears.includes(currentYear)) {
            uniqueYears.push(currentYear);
        }
        return uniqueYears.sort((a,b) => b - a);
    }, [bills]);

    const months = Array.from({ length: 12 }, (_, i) => ({
        value: i,
        label: format(new Date(0, i), 'MMMM')
    }));

    const salesBills = useMemo(() => bills.filter(b => b.type === 'sales-bill'), [bills]);

    const filteredBills = useMemo(() => {
        let startDate: Date;
        let endDate: Date;

        if (periodType === 'monthly') {
            if (selectedMonth === undefined || selectedYear === undefined) return [];
            const date = setYear(setMonth(new Date(), selectedMonth), selectedYear);
            startDate = startOfMonth(date);
            endDate = endOfMonth(date);
        } else if (periodType === 'yearly') {
            if (selectedYear === undefined) return [];
            const date = setYear(new Date(), selectedYear);
            startDate = startOfYear(date);
            endDate = endOfYear(date);
        } else { // custom
            startDate = customStartDate || new Date(0);
            endDate = customEndDate || new Date();
            if (customEndDate && customStartDate && customEndDate < customStartDate) {
                return [];
            }
        }

        return salesBills.filter(bill => {
            const billDate = new Date(bill.date);
            return isWithinInterval(billDate, { start: startDate, end: endDate });
        }).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [periodType, selectedMonth, selectedYear, customStartDate, customEndDate, salesBills]);

    const handlePrint = () => {
        if (selectedMonth === undefined || selectedYear === undefined) return;
        
        const reportTitle = periodType === 'monthly' ? `${months.find(m=>m.value === selectedMonth)?.label} ${selectedYear}` :
                            periodType === 'yearly' ? `Year ${selectedYear}` :
                            customStartDate && customEndDate ? `${format(customStartDate, 'PPP')} to ${format(customEndDate, 'PPP')}`:
                            `Custom Range`;
        
        const totals = filteredBills.reduce((acc, bill) => {
            acc.taxable += bill.subTotal;
            acc.cgst += bill.cgstAmount || 0;
            acc.sgst += bill.sgstAmount || 0;
            acc.totalTax += (bill.cgstAmount || 0) + (bill.sgstAmount || 0);
            return acc;
        }, { taxable: 0, cgst: 0, sgst: 0, totalTax: 0 });

        const itemsHtml = filteredBills.map((bill) => `
            <tr>
              <td style="border: 1px solid #ddd; padding: 6px;">${bill.billNumber || 'N/A'}</td>
              <td style="border: 1px solid #ddd; padding: 6px;">${format(new Date(bill.date), 'dd/MM/yyyy')}</td>
              <td style="border: 1px solid #ddd; padding: 6px;">${bill.customerName || 'N/A'}</td>
              <td style="border: 1px solid #ddd; padding: 6px; text-align: right;">${settings.currencySymbol}${bill.subTotal.toFixed(2)}</td>
              <td style="border: 1px solid #ddd; padding: 6px; text-align: right;">${settings.currencySymbol}${(bill.cgstAmount || 0).toFixed(2)}</td>
              <td style="border: 1px solid #ddd; padding: 6px; text-align: right;">${settings.currencySymbol}${(bill.sgstAmount || 0).toFixed(2)}</td>
              <td style="border: 1px solid #ddd; padding: 6px; text-align: right;">${settings.currencySymbol}${((bill.cgstAmount || 0) + (bill.sgstAmount || 0)).toFixed(2)}</td>
            </tr>
        `).join('');

        const printHtml = `
            <html>
                <head>
                    <title>GST Report - ${reportTitle}</title>
                    <style>
                        body { font-family: sans-serif; }
                        table { width: 100%; border-collapse: collapse; font-size: 12px; }
                        th, td { text-align: left; padding: 8px; }
                        th { background-color: #f2f2f2; }
                        h1, h2 { text-align: center; }
                        .totals { font-weight: bold; }
                    </style>
                </head>
                <body>
                    <h1>${settings.companyName}</h1>
                    <h2>GST Report: ${reportTitle}</h2>
                    <table>
                        <thead>
                            <tr>
                                <th style="border: 1px solid #ddd; padding: 6px;">Bill No.</th>
                                <th style="border: 1px solid #ddd; padding: 6px;">Date</th>
                                <th style="border: 1px solid #ddd; padding: 6px;">Customer</th>
                                <th style="border: 1px solid #ddd; padding: 6px; text-align: right;">Taxable Amount</th>
                                <th style="border: 1px solid #ddd; padding: 6px; text-align: right;">CGST (${settings.cgstRate}%)</th>
                                <th style="border: 1px solid #ddd; padding: 6px; text-align: right;">SGST (${settings.sgstRate}%)</th>
                                <th style="border: 1px solid #ddd; padding: 6px; text-align: right;">Total Tax</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${itemsHtml}
                        </tbody>
                        <tfoot>
                            <tr class="totals">
                                <td colspan="3" style="border: 1px solid #ddd; padding: 6px;">Totals</td>
                                <td style="border: 1px solid #ddd; padding: 6px; text-align: right;">${settings.currencySymbol}${totals.taxable.toFixed(2)}</td>
                                <td style="border: 1px solid #ddd; padding: 6px; text-align: right;">${settings.currencySymbol}${totals.cgst.toFixed(2)}</td>
                                <td style="border: 1px solid #ddd; padding: 6px; text-align: right;">${settings.currencySymbol}${totals.sgst.toFixed(2)}</td>
                                <td style="border: 1px solid #ddd; padding: 6px; text-align: right;">${settings.currencySymbol}${totals.totalTax.toFixed(2)}</td>
                            </tr>
                        </tfoot>
                    </table>
                </body>
            </html>
        `;

        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(printHtml);
            printWindow.document.close();
            printWindow.focus();
            printWindow.print();
        }
    };
    
    const getReportTitle = () => {
         if (!isClient) return '...';
         switch(periodType) {
            case 'monthly':
                return `${months.find(m=>m.value === selectedMonth)?.label} ${selectedYear}`;
            case 'yearly':
                return `Year ${selectedYear}`;
            case 'custom':
                if (customStartDate && customEndDate) {
                    return `${format(customStartDate, 'PPP')} to ${format(customEndDate, 'PPP')}`;
                }
                return 'Custom Range';
            default:
                return '';
        }
    }

    if (!isClient) {
        return (
            <div className="space-y-8">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <Skeleton className="h-12 w-80" />
                    <Skeleton className="h-12 w-44" />
                </div>

                <Card className="shadow-lg border-border">
                    <CardHeader><CardTitle><Skeleton className="h-8 w-40" /></CardTitle></CardHeader>
                    <CardContent><Skeleton className="h-28 w-full" /></CardContent>
                </Card>

                <div className="space-y-4">
                    <Skeleton className="h-8 w-1/2 mx-auto" />
                    <Skeleton className="h-80 w-full" />
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <h1 className="text-3xl lg:text-4xl font-headline text-primary flex items-center">
                    <FilePieChart className="mr-3 h-8 w-8" />
                    GST Tax Report
                </h1>
                <Button onClick={handlePrint} className="shadow-md hover:shadow-lg transition-shadow text-lg px-6 py-3 h-auto">
                    <Printer className="mr-2 h-5 w-5" /> Print Report
                </Button>
            </div>

            <Card className="shadow-lg border-border">
                <CardHeader>
                    <CardTitle>Filter Report</CardTitle>
                </CardHeader>
                <CardContent>
                    <Tabs value={periodType} onValueChange={(value) => setPeriodType(value as PeriodType)} className="w-full">
                        <TabsList className="grid w-full grid-cols-3 mb-6 bg-primary/10">
                            <TabsTrigger value="monthly">Monthly</TabsTrigger>
                            <TabsTrigger value="yearly">Yearly</TabsTrigger>
                            <TabsTrigger value="custom">Custom Range</TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="monthly">
                            <div className="flex items-center gap-4 p-4 border rounded-lg bg-background">
                                <Select value={selectedMonth !== undefined ? String(selectedMonth) : ''} onValueChange={(val) => setSelectedMonth(Number(val))}>
                                    <SelectTrigger className="w-[180px] text-base h-12">
                                        <SelectValue placeholder="Select Month" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {months.map(m => <SelectItem key={m.value} value={String(m.value)} className="text-base py-2">{m.label}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                <Select value={selectedYear !== undefined ? String(selectedYear) : ''} onValueChange={(val) => setSelectedYear(Number(val))}>
                                    <SelectTrigger className="w-[180px] text-base h-12">
                                        <SelectValue placeholder="Select Year" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {years.map(y => <SelectItem key={y} value={String(y)} className="text-base py-2">{y}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </TabsContent>

                        <TabsContent value="yearly">
                             <div className="flex items-center gap-4 p-4 border rounded-lg bg-background">
                                <Select value={selectedYear !== undefined ? String(selectedYear) : ''} onValueChange={(val) => setSelectedYear(Number(val))}>
                                    <SelectTrigger className="w-[180px] text-base h-12">
                                        <SelectValue placeholder="Select Year" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {years.map(y => <SelectItem key={y} value={String(y)} className="text-base py-2">{y}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                             </div>
                        </TabsContent>
                        
                        <TabsContent value="custom">
                            <div className="flex items-center gap-4 p-4 border rounded-lg bg-background">
                               <DatePicker date={customStartDate} setDate={setCustomStartDate} placeholderText="Start Date" className="h-12 text-base" />
                               <span>-</span>
                               <DatePicker date={customEndDate} setDate={setCustomEndDate} placeholderText="End Date" className="h-12 text-base" />
                            </div>
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>

            <div id="report-container">
                 <h2 className="text-2xl font-headline text-center my-4">
                    GST Report for {getReportTitle()}
                </h2>
                <GstReportTable bills={filteredBills} />
            </div>

        </div>
    );
};

export default GstReportPage;
