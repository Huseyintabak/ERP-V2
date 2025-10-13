import { create } from 'zustand';

interface ProductionPlan {
  id: string;
  order_id: string;
  product_id: string;
  planned_quantity: number;
  produced_quantity: number;
  status: string;
  assigned_operator_id?: string;
}

interface ProductionStore {
  activePlans: ProductionPlan[];
  addPlan: (plan: ProductionPlan) => void;
  updatePlan: (id: string, updates: Partial<ProductionPlan>) => void;
  removePlan: (id: string) => void;
}

export const useProductionStore = create<ProductionStore>((set) => ({
  activePlans: [],
  addPlan: (plan) => set((state) => ({ 
    activePlans: [...state.activePlans, plan] 
  })),
  updatePlan: (id, updates) => set((state) => ({
    activePlans: state.activePlans.map(p => 
      p.id === id ? { ...p, ...updates } : p
    )
  })),
  removePlan: (id) => set((state) => ({
    activePlans: state.activePlans.filter(p => p.id !== id)
  })),
}));

