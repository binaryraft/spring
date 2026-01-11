
"use client";
import React, { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DatePicker } from '@/components/ui/date-picker';
import SalesReportTable from '@/components/reports/SalesReportTable';
import PurchaseReportTable from '@/components/reports/PurchaseReportTable';
import { FilePieChart, Printer, Download } from 'lucide-react';
import { startOfMonth, endOfMonth, startOfYear, endOfYear, getYear, getMonth, setYear, setMonth, format, isWithinInterval } from 'date-fns';
import type { Bill, BillItem } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import * as XLSX from 'xlsx';

type PeriodType = 'monthly' | 'yearly' | 'custom';
type ReportType = 'sales' | 'purchase';

// A new type for flattened items for the report
export type ReportItem = BillItem & {
    billDate: string;
    billNumber: string;
    customerName?: string;
    valuableName?: string;
};


const ReportsPage = () => {
    const { bills, settings, getValuableById } = useAppContext();
    const [reportType, setReportType] = useState<ReportType>('sales');
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

    const relevantBillType = reportType === 'sales' ? 'sales-bill' : 'purchase';
    const sourceBills = useMemo(() => bills.filter(b => b.type === relevantBillType), [bills, relevantBillType]);

    const filteredItems = useMemo(() => {
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
        
        const relevantBills = sourceBills.filter(bill => {
            const billDate = new Date(bill.date);
            return isWithinInterval(billDate, { start: startDate, end: endDate });
        });

        // Flatten the items from the filtered bills
        const items: ReportItem[] = relevantBills.flatMap(bill => 
            bill.items.map(item => ({
                ...item,
                billDate: bill.date,
                billNumber: bill.billNumber,
                customerName: bill.customerName,
                valuableName: getValuableById(item.valuableId)?.name || 'Unknown'
            }))
        ).sort((a,b) => new Date(b.billDate).getTime() - new Date(a.billDate).getTime());

        return items;

    }, [periodType, selectedMonth, selectedYear, customStartDate, customEndDate, sourceBills, getValuableById]);

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
    
    const handleExport = (format: 'csv' | 'pdf') => {
        if (format === 'csv') {
            exportToCsv();
        } else {
            handlePrint();
        }
    };
    
    const exportToCsv = () => {
        if (filteredItems.length === 0) return;
        
        let dataToExport;
        let filename = `${reportType}_report_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;

        if(reportType === 'sales') {
            dataToExport = filteredItems.map(item => ({
                'Date': format(new Date(item.billDate), 'dd/MM/yyyy'),
                'Product': item.name,
                'HSN': item.hsnCode || '',
                'Bill No.': item.billNumber,
                'Taxable Amount': item.amount,
                [`CGST (${settings.cgstRate}%)`]: item.itemCgstAmount || 0,
                [`SGST (${settings.sgstRate}%)`]: item.itemSgstAmount || 0,
                'Total Tax': (item.itemCgstAmount || 0) + (item.itemSgstAmount || 0),
            }));
        } else { // purchase
             dataToExport = filteredItems.map(item => ({
                'Date': format(new Date(item.billDate), 'dd/MM/yyyy'),
                'Product': item.name,
                'Material': item.valuableName,
                'Bill No.': item.billNumber,
                'Quantity/Weight': `${item.weightOrQuantity} ${item.unit}`,
                'Rate': item.rate,
                'Amount': item.amount,
            }));
        }
        
        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, `${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report`);
        XLSX.writeFile(workbook, filename);
    };

    const handlePrint = () => {
        if (!isClient) return;
        
        const reportTitle = `${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report for ${getReportTitle()}`;
        
        // This is a simplified print logic. For a rich PDF, we would need a more complex HTML generation
        // similar to the one used for bills. This will use the browser's basic printing.
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            const tableContainer = document.getElementById('report-table-container');
            if (tableContainer) {
                 printWindow.document.write(`
                    <html>
                        <head>
                            <title>${reportTitle}</title>
                            <style>
                                body { font-family: sans-serif; }
                                table { width: 100%; border-collapse: collapse; font-size: 10px; }
                                th, td { border: 1px solid #ddd; padding: 6px; text-align: left; }
                                th { background-color: #f2f2f2; }
                                h1, h2 { text-align: center; }
                                .totals { font-weight: bold; }
                                @media print {
                                    .no-print { display: none; }
                                }
                            </style>
                        </head>
                        <body>
                            <h1>${settings.companyName}</h1>
                            <h2>${reportTitle}</h2>
                            ${tableContainer.innerHTML}
                        </body>
                    </html>
                `);
                printWindow.document.close();
                printWindow.focus();
                printWindow.print();
            }
        }
    };
    
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
                    Financial Reports
                </h1>
                 <div className="flex items-center gap-2">
                    <Button onClick={() => handleExport('csv')} variant="outline" className="shadow-md hover:shadow-lg transition-shadow text-lg px-6 py-3 h-auto">
                        <Download className="mr-2 h-5 w-5" /> Export to CSV
                    </Button>
                    <Button onClick={() => handleExport('pdf')} className="shadow-md hover:shadow-lg transition-shadow text-lg px-6 py-3 h-auto">
                        <Printer className="mr-2 h-5 w-5" /> Print Report
                    </Button>
                 </div>
            </div>
            
            <Tabs value={reportType} onValueChange={(v) => setReportType(v as ReportType)}>
                <TabsList className="grid w-full grid-cols-2 bg-muted">
                    <TabsTrigger value="sales" className="text-lg py-2.5 data-[state=active]:bg-success/90 data-[state=active]:text-success-foreground data-[state=active]:shadow-lg">Sales Report</TabsTrigger>
                    <TabsTrigger value="purchase" className="text-lg py-2.5 data-[state=active]:bg-destructive/90 data-[state=active]:text-destructive-foreground data-[state=active]:shadow-lg">Purchase Report</TabsTrigger>
                </TabsList>
                
                <div className="mt-6">
                    <Card className="shadow-lg border-border">
                        <CardHeader>
                            <CardTitle>Filter Report</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Tabs value={periodType} onValueChange={(value) => setPeriodType(value as PeriodType)} className="w-full">
                                <TabsList className="grid w-full grid-cols-4 mb-6 bg-primary/10">
                                    <TabsTrigger value="daily">Daily</TabsTrigger>
                                    <TabsTrigger value="monthly">Monthly</TabsTrigger>
                                    <TabsTrigger value="yearly">Yearly</TabsTrigger>
                                    <TabsTrigger value="custom">Custom Range</TabsTrigger>
                                </TabsList>
                                
                                <div className="p-4 border rounded-lg bg-background">
                                    {periodType === 'monthly' && (
                                        <div className="flex items-center gap-4">
                                            <Select value={selectedMonth !== undefined ? String(selectedMonth) : ''} onValueChange={(val) => setSelectedMonth(Number(val))}>
                                                <SelectTrigger className="w-[180px] text-base h-12"><SelectValue placeholder="Select Month" /></SelectTrigger>
                                                <SelectContent>{months.map(m => <SelectItem key={m.value} value={String(m.value)} className="text-base py-2">{m.label}</SelectItem>)}</SelectContent>
                                            </Select>
                                            <Select value={selectedYear !== undefined ? String(selectedYear) : ''} onValueChange={(val) => setSelectedYear(Number(val))}>
                                                <SelectTrigger className="w-[180px] text-base h-12"><SelectValue placeholder="Select Year" /></SelectTrigger>
                                                <SelectContent>{years.map(y => <SelectItem key={y} value={String(y)} className="text-base py-2">{y}</SelectItem>)}</SelectContent>
                                            </Select>
                                        </div>
                                    )}
                                     {periodType === 'yearly' && (
                                         <div className="flex items-center gap-4">
                                            <Select value={selectedYear !== undefined ? String(selectedYear) : ''} onValueChange={(val) => setSelectedYear(Number(val))}>
                                                <SelectTrigger className="w-[180px] text-base h-12"><SelectValue placeholder="Select Year" /></SelectTrigger>
                                                <SelectContent>{years.map(y => <SelectItem key={y} value={String(y)} className="text-base py-2">{y}</SelectItem>)}</SelectContent>
                                            </Select>
                                         </div>
                                    )}
                                     {periodType === 'custom' && (
                                        <div className="flex items-center gap-4">
                                           <DatePicker date={customStartDate} setDate={setCustomStartDate} placeholderText="Start Date" className="h-12 text-base" />
                                           <span>-</span>
                                           <DatePicker date={customEndDate} setDate={setCustomEndDate} placeholderText="End Date" className="h-12 text-base" />
                                        </div>
                                    )}
                                     {periodType === 'daily' && (
                                        <div className="flex items-center gap-4 p-2 text-primary font-semibold text-lg">
                                           Showing report for today, {format(new Date(), 'PPP')}
                                        </div>
                                    )}
                                </div>
                            </Tabs>
                        </CardContent>
                    </Card>
                </div>
            
                <div id="report-container" className="mt-8">
                     <h2 className="text-2xl font-headline text-center my-4">
                        {reportType === 'sales' ? 'Sales' : 'Purchase'} Report for {getReportTitle()}
                    </h2>
                    <div id="report-table-container">
                        <TabsContent value="sales">
                            <SalesReportTable items={filteredItems} />
                        </TabsContent>
                        <TabsContent value="purchase">
                            <PurchaseReportTable items={filteredItems} />
                        </TabsContent>
                    </div>
                </div>

            </Tabs>

        </div>
    );
};

export default ReportsPage;
