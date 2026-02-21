import { create } from 'zustand';

export interface CategoryData { _id: string; name: string; description?: string; sortOrder: number; isActive: boolean }
export interface ProductData { _id: string; name: string; description?: string; price: number; image?: string; categoryId: { _id: string; name: string } | string; isAvailable: boolean }
export interface TableData { _id: string; name: string; zone: string; tableType: string; capacity: number; qrCode: string; status: string; createdAt: string; currentSessionId?: { _id: string; status: string; totalAmount: number; startedAt: string; } | null; }
export interface UserData { _id: string; name: string; email: string; avatar?: string; role: string; isActive: boolean; isSystem?: boolean; createdAt: string }
export interface SessionData { _id: string; tableId: { _id: string; name: string; zone: string } | string; status: string; totalAmount: number; paymentMethod?: string; startedAt: string; endedAt?: string }
export interface OrderData { _id: string; sessionId: string; createdBy: string; createdAt: string; items: Array<{ _id: string; name: string; price: number; quantity: number; note?: string; status: string; }>; }
export interface Stats { totalRevenue: number; todaySessions: number; activeSessions: number; totalClosedSessions: number; topItems: { name: string; count: number; revenue: number }[]; totalPayments: number }

interface StoreState {
    stats: Stats | null;
    categories: CategoryData[];
    products: ProductData[];
    tables: TableData[];
    users: UserData[];
    sessions: SessionData[];
    pendingOrders: OrderData[];

    // Actions
    fetchStats: () => Promise<void>;
    fetchCategories: () => Promise<void>;
    fetchProducts: () => Promise<void>;
    fetchTables: () => Promise<void>;
    fetchUsers: () => Promise<void>;
    fetchSessions: (status?: string) => Promise<void>;
    fetchPendingOrders: () => Promise<void>;

    // Helpers
    deleteItem: (type: 'categories' | 'products' | 'tables' | 'users', id: string) => Promise<boolean>;
    saveItem: (type: 'categories' | 'products' | 'tables' | 'users', data: Record<string, unknown>, id?: string) => Promise<{ success: boolean, error?: string }>;
}

export const useStore = create<StoreState>((set) => ({
    stats: null,
    categories: [],
    products: [],
    tables: [],
    users: [],
    sessions: [],
    pendingOrders: [],

    fetchStats: async () => {
        try { const res = await fetch('/api/dashboard/stats'); const d = await res.json(); if (d.success) set({ stats: d.data }); } catch (e) { console.error(e) }
    },
    fetchCategories: async () => {
        try { const res = await fetch('/api/categories'); const d = await res.json(); if (d.success) set({ categories: d.data }); } catch (e) { console.error(e) }
    },
    fetchProducts: async () => {
        try { const res = await fetch('/api/products?all=true'); const d = await res.json(); if (d.success) set({ products: d.data }); } catch (e) { console.error(e) }
    },
    fetchTables: async () => {
        try { const res = await fetch('/api/tables'); const d = await res.json(); if (d.success) set({ tables: d.data }); } catch (e) { console.error(e) }
    },
    fetchUsers: async () => {
        try { const res = await fetch('/api/users'); const d = await res.json(); if (d.success) set({ users: d.data }); } catch (e) { console.error(e) }
    },
    fetchSessions: async (status = 'CLOSED') => {
        try { const res = await fetch(`/api/sessions?status=${status}`); const d = await res.json(); if (d.success) set({ sessions: d.data }); } catch (e) { console.error(e) }
    },
    fetchPendingOrders: async () => {
        try { const res = await fetch('/api/orders?status=PENDING'); const d = await res.json(); if (d.success) set({ pendingOrders: d.data }); } catch (e) { console.error(e) }
    },

    deleteItem: async (type, id) => {
        try {
            const res = await fetch(`/api/${type}/${id}`, { method: 'DELETE' });
            const d = await res.json();
            if (d.success) {
                // Remove locally
                set((state) => ({ [type]: (state[type] as Array<{ _id: string }>).filter((item) => item._id !== id) }));
                return true;
            }
        } catch (e) { console.error(e); }
        return false;
    },

    saveItem: async (type, data, id) => {
        try {
            const url = id ? `/api/${type}/${id}` : `/api/${type}`;
            const res = await fetch(url, { method: id ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
            const d = await res.json();

            if (d.success) {
                // we should re-fetch that collection or update it locally 
                // but re-fetching is safer 
                // we'll just return success and let the caller invoke fetch()
                return { success: true };
            }
            return { success: false, error: d.error };
        } catch (e) { console.error(e); return { success: false, error: 'Lỗi mạng' }; }
    }
}));
