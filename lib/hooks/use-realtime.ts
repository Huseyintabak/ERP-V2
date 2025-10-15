'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

export const useRealtime = (
  table: string,
  onInsert?: (payload: any) => void,
  onUpdate?: (payload: any) => void,
  onDelete?: (payload: any) => void
) => {
  useEffect(() => {
    const supabase = createClient();

    console.log(`🔔 Setting up real-time subscription for table: ${table}`);

    const channel = supabase
      .channel(`${table}-changes-${Date.now()}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: table
      }, (payload) => {
        console.log('🔔 Real-time INSERT:', payload);
        onInsert?.(payload.new);
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: table
      }, (payload) => {
        console.log('🔔 Real-time UPDATE:', payload);
        onUpdate?.(payload.new);
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: table
      }, (payload) => {
        console.log('🔔 Real-time DELETE:', payload);
        onDelete?.(payload.old);
      })
      .subscribe((status) => {
        console.log(`🔔 Real-time subscription status: ${status}`);
      });

    return () => {
      console.log(`🔔 Cleaning up real-time subscription for table: ${table}`);
      supabase.removeChannel(channel);
    };
  }, [table]); // Sadece table dependency'si
};

