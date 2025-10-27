'use client';

import { useState, useEffect } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { logger } from '@/lib/utils/logger';

interface Customer {
  id: string;
  name: string;
  email?: string;
  company?: string;
  is_active: boolean;
}

interface CustomerSelectProps {
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function CustomerSelect({ 
  value, 
  onValueChange, 
  placeholder = "Müşteri seçin",
  disabled = false 
}: CustomerSelectProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const response = await fetch('/api/customers?limit=1000', {
          headers: {
            'Content-Type': 'application/json',
          }
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const text = await response.text();
        if (!text || text.includes('/login')) {
          logger.warn('Redirect to login detected');
          return;
        }
        
        const data = JSON.parse(text);
        logger.log('Customers API response:', data); // Debug log
        setCustomers(data.data || []);
      } catch (error) {
        logger.error('Error fetching customers:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCustomers();
  }, []);

  if (isLoading) {
    return (
      <Select disabled>
        <SelectTrigger>
          <SelectValue placeholder="Yükleniyor..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="loading" disabled>
            <div className="flex items-center">
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Yükleniyor...
            </div>
          </SelectItem>
        </SelectContent>
      </Select>
    );
  }

  const activeCustomers = customers.filter(customer => customer.is_active);

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {activeCustomers.length === 0 ? (
          <SelectItem value="no-customers" disabled>
            Müşteri bulunamadı
          </SelectItem>
        ) : (
          activeCustomers.map((customer) => (
            <SelectItem key={customer.id} value={customer.id}>
              <div className="flex flex-col">
                <span className="font-medium">{customer.name}</span>
                {customer.company && (
                  <span className="text-sm text-muted-foreground">
                    {customer.company}
                  </span>
                )}
                {customer.email && (
                  <span className="text-sm text-muted-foreground">
                    {customer.email}
                  </span>
                )}
              </div>
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
}
