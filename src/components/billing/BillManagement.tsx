
"use client";
import React, { useState, useMemo } from 'react';
import type { Bill, BillType } from '@/types';
import { Button } from '@/components/ui/button';
import { PlusCircle, ArrowLeft } from 'lucide-react';
import BillForm from './BillForm';
import BillHistoryList from './BillHistoryList';
import BillViewModal from './BillViewModal';
import { useAppContext } from '@/contexts/AppContext';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { isToday, isThisMonth, isThisYear } from 'date-fns';

interface BillManagementProps {
  billType: BillType;
}

type Period = 'daily' | 'monthly' | 'yearly' | 'all';

const BillManagement: React.FC<BillManagementProps> = ({ billType }) => {
  const { bills } = useAppContext();
  const [period, setPeriod] = useState<Period>('daily');
  const [showForm, setShowForm] = useState(false);
  const [editingBill, setEditingBill] = useState<Bill | undefined>(undefined);
  const [viewingBill, setViewingBill] = useState<Bill | null>(null);
  const [isViewingEstimate, setIsViewingEstimate] = useState(false);

  const billTypeLabel = billType === 'sales-bill' ? 'Sales' : 'Purchase';
  const billVariant = billType === 'sales-bill' ? 'success' : 'destructive';

  const filteredBills = useMemo(() => {
    const componentBills = bills.filter(bill => bill.type === billType);

    if (period === 'all') {
        return componentBills.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }

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
    return componentBills
        .filter(bill => periodFilter(new Date(bill.date)))
        .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [bills, billType, period]);


  const handleSaveAndPrintBill = (savedBill: Bill) => {
    setEditingBill(undefined);
    setShowForm(false);
    handleViewBill(savedBill, false);
  };

  const handleEditBill = (bill: Bill) => {
    setEditingBill(bill);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleViewBill = (bill: Bill, isEstimate: boolean = false) => {
    setViewingBill(bill);
    setIsViewingEstimate(isEstimate);
  };

  const handleShowEstimatePreview = (estimateData: Bill) => {
    handleViewBill(estimateData, true);
  };

  const handleCreateNew = () => {
    setEditingBill(undefined);
    setShowForm(true);
  };

  const handleCancelForm = () => {
    setEditingBill(undefined);
    setShowForm(false);
  };

  const commonFormProps = {
    onSaveAndPrint: handleSaveAndPrintBill,
    onShowEstimate: billType === 'sales-bill' ? handleShowEstimatePreview : undefined,
    onCancel: handleCancelForm,
  };

  return (
    <div className="w-full space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl lg:text-4xl font-headline text-primary">{billTypeLabel} Management</h1>
        {showForm ? (
          <Button variant="outline" onClick={handleCancelForm} className="shadow-md hover:shadow-lg transition-shadow text-lg px-6 py-3 h-auto">
            <ArrowLeft className="mr-2.5 h-5 w-5" /> Back to History
          </Button>
        ) : (
          <Button onClick={handleCreateNew} variant={billVariant} className="shadow-md hover:shadow-lg transition-shadow text-lg px-6 py-3 h-auto">
            <PlusCircle className="mr-2.5 h-5 w-5" /> Create {billTypeLabel} Bill
          </Button>
        )}
      </div>

      <div className="bg-card p-4 sm:p-6 md:p-8 rounded-lg shadow-xl border border-border">
        {showForm ? (
          <BillForm
            key={editingBill ? editingBill.id : 'new-bill'}
            billType={billType}
            existingBill={editingBill}
            {...commonFormProps}
          />
        ) : (
          <>
            <Tabs value={period} onValueChange={(value) => setPeriod(value as Period)}>
                <TabsList className="grid w-full grid-cols-4 mb-6 bg-primary/10">
                    <TabsTrigger value="daily">Daily</TabsTrigger>
                    <TabsTrigger value="monthly">Monthly</TabsTrigger>
                    <TabsTrigger value="yearly">Yearly</TabsTrigger>
                    <TabsTrigger value="all">All Time</TabsTrigger>
                </TabsList>
            </Tabs>
            <BillHistoryList 
              billType={billType} 
              bills={filteredBills}
              onEditBill={handleEditBill} 
              onViewBill={(bill) => handleViewBill(bill, false)} 
            />
          </>
        )}
      </div>

      <BillViewModal
        bill={viewingBill}
        isOpen={!!viewingBill}
        onClose={() => setViewingBill(null)}
        isEstimateView={isViewingEstimate}
      />
    </div>
  );
};

export default BillManagement;
