
"use client";
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BillForm from './billing/BillForm';
import BillHistoryList from './billing/BillHistoryList';
import type { Bill } from '@/types';
import BillViewModal from './billing/BillViewModal';
import { Card, CardContent } from '@/components/ui/card';

const BillingTabs: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>("sales-bill");
  const [editingBill, setEditingBill] = useState<Bill | undefined>(undefined);
  const [viewingBill, setViewingBill] = useState<Bill | null>(null);

  const handleSaveBill = (savedBill: Bill) => {
    // After saving, if it was an edit, clear editingBill
    // If it was a sales estimate being converted, potentially switch tab or refresh
    setEditingBill(undefined);
    // If savedBill is an estimate, maybe we don't want to switch tabs yet.
    // If it's a bill or purchase, we might want to show the history.
    // For now, just clearing the form is handled by BillForm.
  };

  const handleEditBill = (bill: Bill) => {
    setActiveTab(bill.type); // Switch to the tab of the bill being edited
    setEditingBill(bill);
    window.scrollTo({ top: 0, behavior: 'smooth' }); // Scroll to top to see form
  };

  const handleViewBill = (bill: Bill) => {
    setViewingBill(bill);
  };
  
  const handleConvertToBill = (estimate: Bill) => {
    if(estimate.type === 'sales-estimate') {
      const billFromEstimate: Bill = {
        ...estimate,
        type: 'sales-bill', // Change type
        // Bill number will be re-assigned by addBill if it's a new bill
        // Or keep if desired but ensure uniqueness logic handles it
      };
      setEditingBill(billFromEstimate); // Open in Sales Bill form for finalization
      setActiveTab('sales-bill');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="container mx-auto py-8">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6 bg-primary/10">
          <TabsTrigger value="sales-bill" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Sales Bills</TabsTrigger>
          <TabsTrigger value="sales-estimate" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Sales Estimates</TabsTrigger>
          <TabsTrigger value="purchase" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Purchases</TabsTrigger>
        </TabsList>

        <TabsContent value="sales-bill">
          <Card className="bg-card">
            <CardContent className="p-6">
              <BillForm
                key={editingBill && editingBill.type === 'sales-bill' ? editingBill.id : 'new-sales-bill'}
                billType="sales-bill"
                existingBill={editingBill && editingBill.type === 'sales-bill' ? editingBill : undefined}
                onSave={handleSaveBill}
              />
              <BillHistoryList billType="sales-bill" onEditBill={handleEditBill} onViewBill={handleViewBill} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sales-estimate">
           <Card className="bg-card">
            <CardContent className="p-6">
              <BillForm
                key={editingBill && editingBill.type === 'sales-estimate' ? editingBill.id : 'new-sales-estimate'}
                billType="sales-estimate"
                existingBill={editingBill && editingBill.type === 'sales-estimate' ? editingBill : undefined}
                onSave={handleSaveBill}
              />
              {/* Special history list for estimates that might include a "Convert to Bill" button */}
              {/* For now, using standard list. Convert logic needs UI element in history list or view modal. */}
              <BillHistoryList billType="sales-estimate" onEditBill={handleEditBill} onViewBill={(estimate) => {
                  // Example: Add a "Convert to Bill" option in the view modal or directly
                  // For now, just view it.
                  handleViewBill(estimate);
                  // Or, provide a way to trigger handleConvertToBill(estimate) from the list/view
              }} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="purchase">
           <Card className="bg-card">
            <CardContent className="p-6">
              <BillForm
                key={editingBill && editingBill.type === 'purchase' ? editingBill.id : 'new-purchase'}
                billType="purchase"
                existingBill={editingBill && editingBill.type === 'purchase' ? editingBill : undefined}
                onSave={handleSaveBill}
              />
              <BillHistoryList billType="purchase" onEditBill={handleEditBill} onViewBill={handleViewBill} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      <BillViewModal bill={viewingBill} isOpen={!!viewingBill} onClose={() => setViewingBill(null)} />
    </div>
  );
};

export default BillingTabs;
