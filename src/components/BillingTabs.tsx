
"use client";
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BillForm from './billing/BillForm';
import BillHistoryList from './billing/BillHistoryList';
import type { Bill } from '@/types';
import BillViewModal from './billing/BillViewModal';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';

const BillingTabs: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>("sales-bill");
  const [editingBill, setEditingBill] = useState<Bill | undefined>(undefined);
  const [viewingBill, setViewingBill] = useState<Bill | null>(null);
  const [isViewingEstimate, setIsViewingEstimate] = useState(false);

  const [showSalesForm, setShowSalesForm] = useState(false);
  const [showPurchaseForm, setShowPurchaseForm] = useState(false);

  const handleSaveBill = (savedBill: Bill) => {
    setEditingBill(undefined);
    if (savedBill.type === 'sales-bill') {
      setShowSalesForm(false);
    } else if (savedBill.type === 'purchase') {
      setShowPurchaseForm(false);
    }
  };

  const handleEditBill = (bill: Bill) => {
    setEditingBill(bill);
    if (bill.type === 'sales-bill') {
      setShowSalesForm(true);
      setActiveTab('sales-bill');
    } else if (bill.type === 'purchase') {
      setShowPurchaseForm(true);
      setActiveTab('purchase');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleViewBill = (bill: Bill, isEstimate: boolean = false) => {
    setViewingBill(bill);
    setIsViewingEstimate(isEstimate);
  };

  const handleShowEstimate = (estimateData: Bill) => {
    handleViewBill(estimateData, true);
  }

  const commonFormProps = {
    onSave: handleSaveBill,
  };

  return (
    <div className="container mx-auto py-8">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6 bg-primary/10">
          <TabsTrigger value="sales-bill" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Sales</TabsTrigger>
          <TabsTrigger value="purchase" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Purchases</TabsTrigger>
        </TabsList>

        <TabsContent value="sales-bill">
          <Card className="bg-card">
            <CardContent className="p-6">
              {showSalesForm ? (
                <BillForm
                  key={editingBill && editingBill.type === 'sales-bill' ? editingBill.id : 'new-sales-bill'}
                  billType="sales-bill"
                  existingBill={editingBill && editingBill.type === 'sales-bill' ? editingBill : undefined}
                  onSave={handleSaveBill}
                  onCancel={() => { setEditingBill(undefined); setShowSalesForm(false); }}
                  onShowEstimate={handleShowEstimate}
                />
              ) : (
                <>
                  <div className="flex justify-end mb-4">
                    <Button onClick={() => { setEditingBill(undefined); setShowSalesForm(true); }}>
                      <PlusCircle className="mr-2 h-4 w-4" /> Create Sales Bill
                    </Button>
                  </div>
                  <BillHistoryList billType="sales-bill" onEditBill={handleEditBill} onViewBill={(bill) => handleViewBill(bill, false)} />
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="purchase">
           <Card className="bg-card">
            <CardContent className="p-6">
              {showPurchaseForm ? (
                <BillForm
                  key={editingBill && editingBill.type === 'purchase' ? editingBill.id : 'new-purchase'}
                  billType="purchase"
                  existingBill={editingBill && editingBill.type === 'purchase' ? editingBill : undefined}
                  onSave={handleSaveBill}
                  onCancel={() => { setEditingBill(undefined); setShowPurchaseForm(false); }}
                />
              ) : (
                <>
                  <div className="flex justify-end mb-4">
                    <Button onClick={() => { setEditingBill(undefined); setShowPurchaseForm(true); }}>
                      <PlusCircle className="mr-2 h-4 w-4" /> Create Purchase Bill
                    </Button>
                  </div>
                  <BillHistoryList billType="purchase" onEditBill={handleEditBill} onViewBill={(bill) => handleViewBill(bill, false)} />
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      <BillViewModal 
        bill={viewingBill} 
        isOpen={!!viewingBill} 
        onClose={() => setViewingBill(null)}
        isEstimateView={isViewingEstimate}
      />
    </div>
  );
};

export default BillingTabs;
