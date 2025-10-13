'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CustomerForm } from './customer-form';
import { Plus, Edit } from 'lucide-react';

interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  address?: string;
  tax_number?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface CustomerDialogProps {
  customer?: Customer;
  onSuccess: () => void;
  trigger?: React.ReactNode;
}

export function CustomerDialog({ customer, onSuccess, trigger }: CustomerDialogProps) {
  const [open, setOpen] = useState(false);

  const handleSuccess = () => {
    onSuccess();
    setOpen(false);
  };

  const handleCancel = () => {
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            {customer ? 'Düzenle' : 'Yeni Müşteri'}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {customer ? 'Müşteri Düzenle' : 'Yeni Müşteri Ekle'}
          </DialogTitle>
        </DialogHeader>
        <CustomerForm
          customer={customer}
          onSuccess={handleSuccess}
          onCancel={handleCancel}
        />
      </DialogContent>
    </Dialog>
  );
}

