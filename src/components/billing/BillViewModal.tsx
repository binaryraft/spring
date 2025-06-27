
"use client";
import React, { useState, useEffect } from 'react';
import type { Bill } from '@/types';
import { useAppContext } from '@/contexts/AppContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { format } from 'date-fns';
import { Printer } from 'lucide-react';
import { generateBillHtml, directPrint } from '@/lib/print';

interface BillViewModalProps {
  bill: Bill | null;
  isOpen: boolean;
  onClose: () => void;
  isViewingEstimate?: boolean;
}

const BillViewModal: React.FC<BillViewModalProps> = ({ bill, isOpen, onClose, isViewingEstimate = false }) => {
  const { settings, getValuableById } = useAppContext();
  const [billHtml, setBillHtml] = useState('');

  useEffect(() => {
    if (bill && isOpen) {
        setBillHtml(generateBillHtml(bill, settings, getValuableById, isViewingEstimate));
    }
  }, [bill, isOpen, settings, getValuableById, isViewingEstimate]);

  const handlePrint = () => {
    if (!bill) return;
    directPrint(bill, settings, getValuableById, isViewingEstimate);
  };
  
  if (!bill) return null;

  const effectiveBillType = isViewingEstimate ? 'Estimate' : bill.type === 'purchase' ? 'Purchase Invoice' : 'Sales Bill';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[95vh] flex flex-col text-base w-full max-w-screen-xl"> 
        <DialogHeader className="print-hidden pb-4 border-b">
          <DialogTitle className="font-headline text-2xl lg:text-3xl text-primary">
            {effectiveBillType}
          </DialogTitle>
          <DialogDescription className="text-lg">
            {isViewingEstimate ? "Estimate Preview" : `Bill No: ${bill.billNumber || 'N/A'}`} | Date: {format(new Date(bill.date), 'PPP')}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-grow overflow-y-auto bg-muted/30 p-4"> 
          <div className="shadow-lg bg-white" dangerouslySetInnerHTML={{ __html: billHtml }} />
        </div>
        <DialogFooter className="p-4 border-t mt-auto print-hidden">
          <Button id="print-btn" variant="outline" onClick={handlePrint} className="text-base px-5 py-2.5 h-auto">
            <Printer className="mr-2 h-4 w-4"/>
            Print
          </Button>
          <Button variant="outline" onClick={onClose} className="text-base px-5 py-2.5 h-auto">Close</Button>
        </DialogFooter>
    </DialogContent>
  </Dialog>
  );
};

export default BillViewModal;
