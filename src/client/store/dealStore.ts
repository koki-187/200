import { create } from 'zustand'

export interface Deal {
  id: number
  title: string
  description: string | null
  location: string | null
  land_area: string | null
  price: string | null
  seller_id: number
  status: string
  deadline: string | null
  created_at: string
  updated_at: string
  seller_name?: string
  response_time_remaining?: number
}

interface DealState {
  deals: Deal[]
  currentDeal: Deal | null
  filters: {
    status?: string
    deadlineStatus?: string
    searchTerm?: string
    priceMin?: number
    priceMax?: number
    areaMin?: number
    areaMax?: number
    location?: string
    station?: string
  }
  sortBy: 'updated_at' | 'created_at' | 'deadline' | 'title'
  sortOrder: 'asc' | 'desc'
  viewMode: 'grid' | 'list'
  
  setDeals: (deals: Deal[]) => void
  setCurrentDeal: (deal: Deal | null) => void
  addDeal: (deal: Deal) => void
  updateDeal: (id: number, updates: Partial<Deal>) => void
  deleteDeal: (id: number) => void
  setFilters: (filters: DealState['filters']) => void
  setSorting: (sortBy: DealState['sortBy'], sortOrder: DealState['sortOrder']) => void
  setViewMode: (mode: 'grid' | 'list') => void
  resetFilters: () => void
}

export const useDealStore = create<DealState>((set) => ({
  deals: [],
  currentDeal: null,
  filters: {},
  sortBy: 'updated_at',
  sortOrder: 'desc',
  viewMode: 'grid',
  
  setDeals: (deals) => set({ deals }),
  
  setCurrentDeal: (deal) => set({ currentDeal: deal }),
  
  addDeal: (deal) => set((state) => ({
    deals: [deal, ...state.deals]
  })),
  
  updateDeal: (id, updates) => set((state) => ({
    deals: state.deals.map((deal) =>
      deal.id === id ? { ...deal, ...updates } : deal
    ),
    currentDeal: state.currentDeal?.id === id
      ? { ...state.currentDeal, ...updates }
      : state.currentDeal
  })),
  
  deleteDeal: (id) => set((state) => ({
    deals: state.deals.filter((deal) => deal.id !== id),
    currentDeal: state.currentDeal?.id === id ? null : state.currentDeal
  })),
  
  setFilters: (filters) => set({ filters }),
  
  setSorting: (sortBy, sortOrder) => set({ sortBy, sortOrder }),
  
  setViewMode: (mode) => set({ viewMode: mode }),
  
  resetFilters: () => set({ filters: {} })
}))
