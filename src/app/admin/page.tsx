/* eslint-disable @next/next/no-img-element */
'use client';

import { useEffect, useState } from 'react';
import {
    Box, Typography, Grid, TextField, MenuItem, Snackbar, Alert,
    CircularProgress, Dialog, DialogContent, IconButton,
    Button, Avatar, Divider, Card,
} from '@mui/material';
import { QrCode, Download, OpenInNew, Close, TrendingUp, Star, Payment, EventAvailable, Email, CalendarToday, Block, CheckCircle, Refresh, Restaurant, AccessTime, ShowChart, ChairAlt, Deck } from '@mui/icons-material';
import {
    ThemeRegistry, AppSidebar, AppHeader, ImageUpload,
    StatCard, ProductCard, FormModal, SectionContainer,
    PrimaryButton, OutlinedButton, CategoryChip,
} from '@/components/admin';
import type { AdminTab } from '@/components/admin';
import { useStore, TableData, UserData, ProductData, SessionData } from '@/store';

type ModalType = 'category' | 'product' | 'table' | 'user' | 'profile';

interface StaffPerformance {
    totalRevenue: number;
    todayRevenue: number;
    totalOrders: number;
    totalItems: number;
    confirmedCount: number;
    todayConfirmedCount: number;
}

interface InvoiceDetails {
    tableId?: { name: string };
    startedAt?: string;
    endedAt?: string;
    paymentMethod?: string;
    totalAmount?: number;
    orders?: Array<{
        _id: string;
        createdAt: string;
        createdBy: string;
        creatorName?: string;
        items: Array<{ name: string; quantity: number; price: number }>;
    }>;
    payment?: {
        confirmedBy?: { name: string; email: string };
        paidAt?: string;
        receiptImage?: string;
    } | null;
}

export default function AdminDashboard() {
    const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedCat, setSelectedCat] = useState('all');
    const [selectedFloor, setSelectedFloor] = useState('all');

    const {
        stats, categories, products, tables, users, sessions, pendingOrders,
        fetchStats, fetchCategories, fetchProducts, fetchTables, fetchUsers, fetchSessions, fetchPendingOrders,
        saveItem, deleteItem
    } = useStore();

    const [showModal, setShowModal] = useState(false);
    const [modalType, setModalType] = useState<ModalType>('category');
    const [editingItem, setEditingItem] = useState<Record<string, unknown> | null>(null);
    const [formData, setFormData] = useState<Record<string, unknown>>({});
    const [notification, setNotification] = useState<{ msg: string; severity: 'success' | 'error' } | null>(null);

    const [qrTable, setQrTable] = useState<TableData | null>(null);
    const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
    const [qrLoading, setQrLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [currentUser, setCurrentUser] = useState<UserData | null>(null);

    const [viewInvoiceId, setViewInvoiceId] = useState<string | null>(null);
    const [invoiceDetails, setInvoiceDetails] = useState<InvoiceDetails | null>(null);

    // Staff Revamp State
    const [staffDetail, setStaffDetail] = useState<UserData | null>(null);
    const [staffStats, setStaffStats] = useState<StaffPerformance | null>(null);
    const [staffRoleFilter, setStaffRoleFilter] = useState('all');
    const [staffStatusFilter, setStaffStatusFilter] = useState('all');
    const [isFetchingStaffStats, setIsFetchingStaffStats] = useState(false);

    const handleViewInvoice = async (id: string) => {
        setViewInvoiceId(id);
        setInvoiceDetails(null);
        try {
            const res = await fetch(`/api/sessions/${id}`);
            const data: { success: boolean; data: InvoiceDetails; error?: string } = await res.json();
            if (data.success) setInvoiceDetails(data.data);
        } catch {
            notify('Lỗi tải chi tiết hoá đơn', 'error');
        }
    };

    const fmt = (n: number) => new Intl.NumberFormat('vi-VN').format(n) + 'đ';
    const notify = (msg: string, severity: 'success' | 'error' = 'success') => setNotification({ msg, severity });

    useEffect(() => {
        (async () => {
            setIsLoading(true);
            await Promise.all([
                fetchStats(),
                fetchCategories(),
                fetchProducts(),
                fetchTables(),
                fetchUsers(),
                fetchSessions('CLOSED'),
                fetchPendingOrders(),
                fetch('/api/auth/me').then(r => r.json()).then(d => d.success && setCurrentUser(d.data)),
            ]);
            setIsLoading(false);
        })();
    }, [fetchStats, fetchCategories, fetchProducts, fetchTables, fetchUsers, fetchSessions, fetchPendingOrders]);
    useEffect(() => {
        if (activeTab === 'reports' || activeTab === 'dashboard') {
            fetchStats();
        }
    }, [activeTab, fetchStats]);
    const reloadData = async (type: ModalType) => {
        if (type === 'category') await fetchCategories();
        if (type === 'product') await fetchProducts();
        if (type === 'table') await fetchTables();
        if (type === 'user') await fetchUsers();
    };

    const openCreate = (type: ModalType) => {
        setModalType(type); setEditingItem(null);
        setFormData(
            type === 'category' ? { name: '', description: '', sortOrder: 0 } :
                type === 'product' ? { name: '', description: '', price: 0, categoryId: categories[0]?._id || '', isAvailable: true } :
                    type === 'table' ? { name: '', zone: '', tableType: 'REGULAR', capacity: 4 } :
                        { name: '', email: '', password: '', role: 'STAFF' }
        );
        setShowModal(true);
    };

    const openEdit = (type: ModalType, item: Record<string, unknown>) => {
        setModalType(type); setEditingItem(item);
        const data = { ...item }; if (type === 'product') data.categoryId = (item.categoryId as { _id: string })?._id || item.categoryId;
        setFormData(data); setShowModal(true);
    };

    const handleSave = async () => {
        if (modalType === 'profile') {
            if (!currentUser) return;
            const body: Record<string, string> = { name: formData.name as string || '', avatar: formData.avatar as string || '' };
            if (formData.password) body.password = formData.password as string;
            try {
                const res = await fetch(`/api/users/${currentUser._id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
                const data = await res.json();
                if (data.success) { notify('Cập nhật tài khoản thành công'); setCurrentUser({ ...currentUser, ...data.data }); setShowModal(false); } else { notify(data.error || 'Lỗi', 'error'); }
            } catch { notify('Lỗi mạng', 'error'); }
            return;
        }

        const ep = modalType === 'category' ? 'categories' : modalType === 'product' ? 'products' : modalType === 'table' ? 'tables' : 'users';
        try {
            const res = await saveItem(ep, formData, editingItem?._id as string | undefined);
            if (res.success) { notify('Lưu thành công'); setShowModal(false); reloadData(modalType); }
            else notify(res.error || 'Lỗi lưu dữ liệu', 'error');
        } catch { notify('Lỗi mạng', 'error'); }
    };

    const handleDelete = async (type: ModalType, id: string) => {
        if (!confirm('Bạn có chắc xoá mục này không?')) return;
        const ep = type === 'category' ? 'categories' : type === 'product' ? 'products' : type === 'table' ? 'tables' : 'users';
        const success = await deleteItem(ep, id);
        if (success) notify('Đã xoá'); else notify('Lỗi', 'error');
    };

    const toggleAvail = async (p: ProductData) => {
        const res = await saveItem('products', { isAvailable: !p.isAvailable }, p._id);
        if (res.success) reloadData('product');
    };

    const openQR = async (t: TableData) => {
        setQrTable(t); setQrLoading(true); setQrDataUrl(null);
        try {
            const d = await (await fetch(`/api/tables/${t._id}/qrcode?format=dataurl`)).json();
            if (d.success) setQrDataUrl(d.data.qrDataUrl);
        } catch { notify('Lỗi tạo QR', 'error'); }
        setQrLoading(false);
    };

    const dlQR = (table: TableData) => {
        const a = document.createElement('a'); a.href = `/api/tables/${table._id}/qrcode`; a.download = `QR-${table.name.replace(/\s+/g, '-')}.png`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a); notify('Đã tải ảnh QR');
    };

    const handleViewStaffDetail = async (u: UserData) => {
        setStaffDetail(u);
        setIsFetchingStaffStats(true);
        try {
            const res = await fetch(`/api/users/${u._id}/stats`);
            const d = await res.json();
            if (d.success) setStaffStats(d.data.performance);
        } catch { notify('Lỗi tải thống kê', 'error'); }
        setIsFetchingStaffStats(false);
    };

    const handleToggleStaffActive = async (u: UserData) => {
        const res = await saveItem('users', { isActive: !u.isActive }, u._id);
        if (res.success) {
            reloadData('user');
            notify(u.isActive ? 'Đã vô hiệu hoá' : 'Đã kích hoạt');
        } else notify('Lỗi hệ thống', 'error');
    };

    const handleResetStaffPwd = async (u: UserData) => {
        const pwd = window.prompt(`Nhập mật khẩu mới cho ${u.name}:`);
        if (!pwd) return;
        const res = await saveItem('users', { password: pwd }, u._id);
        if (res.success) notify('Đã đổi mật khẩu'); else notify('Lỗi', 'error');
    };

    const tabLabels: Record<AdminTab, string> = { dashboard: 'Dashboard', menu: 'Menu', tables: 'Quản lý bàn', staff: 'Nhân viên', invoices: 'Hoá đơn', reports: 'Báo cáo & Chốt sổ' };

    if (isLoading) return (
        <ThemeRegistry>
            <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default' }}>
                <CircularProgress color="primary" />
            </Box>
        </ThemeRegistry>
    );

    return (
        <ThemeRegistry>
            <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
                <AppSidebar activeTab={activeTab} onTabChange={setActiveTab} open={sidebarOpen} onClose={() => setSidebarOpen(false)} user={currentUser} onOpenProfile={() => { setModalType('profile'); setFormData({ name: currentUser?.name || '', avatar: currentUser?.avatar || '', password: '' }); setShowModal(true); }} />

                <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', maxHeight: '100vh', overflow: 'hidden' }}>
                    <AppHeader title={tabLabels[activeTab]} breadcrumb={tabLabels[activeTab]} onMenuClick={() => setSidebarOpen(true)} searchValue={search} onSearchChange={setSearch} />

                    <Box component="main" sx={{ flex: 1, overflow: 'auto', p: { xs: 2, md: 3 } }}>
                        {/* ── DASHBOARD REVAMP ── */}
                        {activeTab === 'dashboard' && stats && (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                {/* Top Stats */}
                                <Grid container spacing={3}>
                                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                        <StatCard title="Tổng doanh thu" value={fmt(stats.totalRevenue)} icon={<ShowChart sx={{ fontSize: 28 }} />} color="#10b981" bgcolor="rgba(16, 185, 129, 0.1)" />
                                    </Grid>
                                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                        <StatCard title="Session hôm nay" value={stats.todaySessions} icon={<CalendarToday sx={{ fontSize: 24 }} />} color="#3b82f6" bgcolor="rgba(59, 130, 246, 0.1)" />
                                    </Grid>
                                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                        <StatCard title="Đang phục vụ" value={stats.activeSessions} icon={<Restaurant sx={{ fontSize: 24 }} />} color="#f59e0b" bgcolor="rgba(245, 158, 11, 0.1)" />
                                    </Grid>
                                    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                        <StatCard title="Thẻ thanh toán" value={stats.totalPayments} icon={<Payment sx={{ fontSize: 24 }} />} color="#8b5cf6" bgcolor="rgba(139, 92, 246, 0.1)" />
                                    </Grid>
                                </Grid>

                                <Grid container spacing={3}>
                                    {/* Left Column: Activity & Items */}
                                    <Grid size={{ xs: 12, lg: 8 }}>
                                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                                            <SectionContainer>
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                                                    <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>📈 Hiệu suất món ăn</Typography>
                                                    <PrimaryButton size="small" variant="text" onClick={() => setActiveTab('menu')}>Chi tiết Menu</PrimaryButton>
                                                </Box>
                                                {stats.topItems.length === 0 ? (
                                                    <Box sx={{ textAlign: 'center', py: 6, border: '2px dashed', borderColor: 'divider', borderRadius: 4 }}>
                                                        <Typography color="text.secondary">Chưa có dữ liệu thống kê</Typography>
                                                    </Box>
                                                ) : (
                                                    <Grid container spacing={2}>
                                                        {stats.topItems.slice(0, 6).map((item, i) => (
                                                            <Grid key={i} size={{ xs: 12, sm: 6 }}>
                                                                <Box sx={{ p: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center', '&:hover': { bgcolor: 'rgba(59, 130, 246, 0.02)', borderColor: 'primary.main' } }}>
                                                                    <Box>
                                                                        <Typography variant="subtitle2" fontWeight={700}>{item.name}</Typography>
                                                                        <Typography variant="caption" color="text.secondary">{item.count} lượt bán</Typography>
                                                                    </Box>
                                                                    <Typography variant="body1" fontWeight={800} color="success.main">{fmt(item.revenue)}</Typography>
                                                                </Box>
                                                            </Grid>
                                                        ))}
                                                    </Grid>
                                                )}
                                            </SectionContainer>

                                            <SectionContainer>
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                                                    <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>⌛ Đơn hàng đang chờ</Typography>
                                                    <Typography variant="caption" sx={{ px: 1, py: 0.5, bgcolor: 'error.main', color: '#fff', borderRadius: 1, fontWeight: 700 }}>{pendingOrders.length} Yêu cầu</Typography>
                                                </Box>
                                                {pendingOrders.length === 0 ? (
                                                    <Box sx={{ textAlign: 'center', py: 6, border: '2px dashed', borderColor: 'divider', borderRadius: 4 }}>
                                                        <Typography color="text.secondary">Tất cả đơn hàng đã được xử lý ✨</Typography>
                                                    </Box>
                                                ) : (
                                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                                        {pendingOrders.map(o => (
                                                            <Box key={o._id} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'all 0.2s', '&:hover': { transform: 'scale(1.01)', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' } }}>
                                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                                                    <Avatar sx={{ bgcolor: 'warning.light', color: 'warning.dark', fontWeight: 700 }}>{tables.find(t => t.currentSessionId?._id === o.sessionId)?.name.charAt(0) || 'B'}</Avatar>
                                                                    <Box>
                                                                        <Typography variant="subtitle2" fontWeight={700}>{tables.find(t => t.currentSessionId?._id === o.sessionId)?.name || 'Bàn ẩn'}</Typography>
                                                                        <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><AccessTime sx={{ fontSize: 12 }} /> {new Date(o.createdAt).toLocaleTimeString('vi-VN')}</Typography>
                                                                    </Box>
                                                                </Box>
                                                                <Box sx={{ textAlign: 'right' }}>
                                                                    <Typography variant="body2" fontWeight={600} display="block">{o.items.length} món</Typography>
                                                                    <PrimaryButton size="small" onClick={() => setActiveTab('tables')}>Xử lý</PrimaryButton>
                                                                </Box>
                                                            </Box>
                                                        ))}
                                                    </Box>
                                                )}
                                            </SectionContainer>
                                        </Box>
                                    </Grid>

                                    {/* Right Column: Status & Activity Feed */}
                                    <Grid size={{ xs: 12, lg: 4 }}>
                                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                                            <SectionContainer>
                                                <Typography variant="h6" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>📍 Tình trạng bàn</Typography>
                                                <Grid container spacing={2}>
                                                    <Grid size={{ xs: 4, sm: 4 }}>
                                                        <Box sx={{ p: 2, borderRadius: 2, bgcolor: '#f0fdf4', border: '1px solid #bbf7d0', textAlign: 'center' }}>
                                                            <Typography variant="caption" color="#166534" fontWeight={700} display="block">Trống</Typography>
                                                            <Typography variant="h5" color="#166534" fontWeight={800}>{tables.filter(t => t.status === 'AVAILABLE').length}</Typography>
                                                        </Box>
                                                    </Grid>
                                                    <Grid size={{ xs: 4, sm: 4 }}>
                                                        <Box sx={{ p: 2, borderRadius: 2, bgcolor: '#eff6ff', border: '1px solid #bfdbfe', textAlign: 'center' }}>
                                                            <Typography variant="caption" color="#1e40af" fontWeight={700} display="block">Bận</Typography>
                                                            <Typography variant="h5" color="#1e40af" fontWeight={800}>{tables.filter(t => t.status === 'OCCUPIED' || t.status === 'PAYMENT_REQUESTED' || t.status === 'WAITING_PAYMENT').length}</Typography>
                                                        </Box>
                                                    </Grid>
                                                    <Grid size={{ xs: 4, sm: 4 }}>
                                                        <Box sx={{ p: 2, borderRadius: 2, bgcolor: '#fef2f2', border: '1px solid #fecaca', textAlign: 'center' }}>
                                                            <Typography variant="caption" color="#991b1b" fontWeight={700} display="block">Hỗ trợ</Typography>
                                                            <Typography variant="h5" color="#991b1b" fontWeight={800}>{tables.filter(t => t.status === 'NEEDS_HELP').length}</Typography>
                                                        </Box>
                                                    </Grid>
                                                </Grid>
                                                <Box sx={{ mt: 3, p: 2, borderRadius: 3, bgcolor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                                        <Typography variant="caption" fontWeight={600}>Hiệu suất bàn</Typography>
                                                        <Typography variant="caption" fontWeight={700} color="primary">{Math.round((tables.filter(t => t.status !== 'AVAILABLE').length / tables.length) * 100) || 0}%</Typography>
                                                    </Box>
                                                    <Box sx={{ width: '100%', height: 6, bgcolor: '#e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
                                                        <Box sx={{ width: `${(tables.filter(t => t.status !== 'AVAILABLE').length / tables.length) * 100}%`, height: '100%', bgcolor: 'primary.main', transition: 'width 1s ease-in-out' }} />
                                                    </Box>
                                                </Box>
                                            </SectionContainer>

                                            <SectionContainer>
                                                <Typography variant="h6" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>⭐ Nhân viên xuất sắc</Typography>
                                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                                    {stats.topEmployees.slice(0, 3).map((emp, i) => (
                                                        <Box key={emp.id} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                                            <Avatar sx={{ width: 32, height: 32, fontSize: 14, bgcolor: i === 0 ? 'primary.main' : i === 1 ? 'secondary.main' : 'grey.400' }}>{emp.name.charAt(0)}</Avatar>
                                                            <Box sx={{ flex: 1 }}>
                                                                <Typography variant="subtitle2" fontWeight={700} noWrap>{emp.name}</Typography>
                                                                <Typography variant="caption" color="text.secondary">{emp.count} hoá đơn · {fmt(emp.total)}</Typography>
                                                            </Box>
                                                            {i === 0 && <Star sx={{ color: '#f59e0b', fontSize: 18 }} />}
                                                        </Box>
                                                    ))}
                                                    {stats.topEmployees.length === 0 && (
                                                        <Typography variant="caption" color="text.secondary" textAlign="center">Cần thêm dữ liệu thanh toán</Typography>
                                                    )}
                                                </Box>
                                            </SectionContainer>

                                            <SectionContainer>
                                                <Typography variant="h6" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>📰 Hoạt động gần đây</Typography>
                                                <Box sx={{ borderLeft: '2px solid', borderColor: 'divider', ml: 1.5, pl: 3, display: 'flex', flexDirection: 'column', gap: 3.5 }}>
                                                    {sessions.slice(0, 5).map((s: SessionData) => (
                                                        <Box key={s._id} sx={{ position: 'relative' }}>
                                                            <Box sx={{ position: 'absolute', left: -24 - 1, top: 4, width: 10, height: 10, borderRadius: '50%', bgcolor: 'primary.main', border: '2px solid #fff' }} />
                                                            <Typography variant="subtitle2" fontWeight={700}>{typeof s.tableId === 'object' ? s.tableId.name : 'Hoá đơn mới'} hoàn tất</Typography>
                                                            <Typography variant="caption" color="text.secondary" display="block">{new Date(s.endedAt || s.startedAt).toLocaleTimeString('vi-VN')}</Typography>
                                                            <Typography variant="body2" fontWeight={700} color="success.main" sx={{ mt: 0.5 }}>+{fmt(s.totalAmount)}</Typography>
                                                        </Box>
                                                    ))}
                                                </Box>
                                                <Box sx={{ mt: 3, textAlign: 'center' }}>
                                                    <OutlinedButton fullWidth size="small" onClick={() => setActiveTab('invoices')}>Xem tất cả lịch sử</OutlinedButton>
                                                </Box>
                                            </SectionContainer>
                                        </Box>
                                    </Grid>
                                </Grid>
                            </Box>
                        )}

                        {/* ── MENU ── */}
                        {activeTab === 'menu' && (
                            <SectionContainer>
                                {/* Toolbar: categories left, actions right */}
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, mb: 3, flexWrap: 'wrap' }}>
                                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', alignItems: 'center' }}>
                                        <CategoryChip label="Tất cả" active={selectedCat === 'all'} onClick={() => setSelectedCat('all')} />
                                        {categories.map(c => (
                                            <CategoryChip key={c._id} label={c.name} active={selectedCat === c._id} onClick={() => setSelectedCat(c._id)} />
                                        ))}
                                    </Box>
                                    <Box sx={{ display: 'flex', gap: 1 }}>
                                        <OutlinedButton onClick={() => openCreate('category')}>+ Danh mục</OutlinedButton>
                                        <PrimaryButton onClick={() => openCreate('product')}>+ Sản phẩm</PrimaryButton>
                                    </Box>
                                </Box>

                                {/* Product grid */}
                                <Grid container spacing={2.5}>
                                    {products
                                        .filter(p => selectedCat === 'all' || (typeof p.categoryId === 'object' ? p.categoryId._id : p.categoryId) === selectedCat)
                                        .filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase())).map(p => (
                                            <Grid key={p._id} size={{ xs: 6, sm: 4, md: 3 }}>
                                                <ProductCard
                                                    name={p.name}
                                                    price={fmt(p.price)}
                                                    image={p.image}
                                                    available={p.isAvailable}
                                                    onEdit={() => openEdit('product', p as unknown as Record<string, unknown>)}
                                                    onDelete={() => handleDelete('product', p._id)}
                                                    onToggle={() => toggleAvail(p)}
                                                />
                                            </Grid>
                                        ))}
                                </Grid>
                            </SectionContainer>
                        )}

                        {/* ── TABLES REVAMP ── */}
                        {activeTab === 'tables' && (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                                {/* Floor Navigation & Header */}
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 3, mb: 1 }}>
                                    <Box sx={{ display: 'flex', gap: 1, backgroundColor: '#f1f5f9', p: 0.75, borderRadius: 3, overflowX: 'auto', maxWidth: '100%', scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' } }}>
                                        {['all', ...Array.from(new Set(tables.map(t => t.zone))).sort()].map(floor => (
                                            <Button
                                                key={floor}
                                                size="small"
                                                onClick={() => setSelectedFloor(floor)}
                                                sx={{
                                                    px: 2,
                                                    borderRadius: 2.5,
                                                    textTransform: 'none',
                                                    fontWeight: 600,
                                                    bgcolor: selectedFloor === floor ? '#fff' : 'transparent',
                                                    color: selectedFloor === floor ? 'primary.main' : 'text.secondary',
                                                    boxShadow: selectedFloor === floor ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                                                    '&:hover': { bgcolor: selectedFloor === floor ? '#fff' : 'rgba(0,0,0,0.05)' }
                                                }}
                                            >
                                                {floor === 'all' ? 'Tất cả tầng' : floor}
                                            </Button>
                                        ))}
                                    </Box>
                                    <PrimaryButton startIcon={<ChairAlt />} onClick={() => openCreate('table')}>+ Tạo bàn mới</PrimaryButton>
                                </Box>

                                {/* Floor Summary Card */}
                                <SectionContainer sx={{ py: 3, px: 3 }}>
                                    <Grid container spacing={4} alignItems="center">
                                        <Grid size={{ xs: 12, md: 4 }}>
                                            <Box>
                                                <Typography variant="h6" fontWeight={800}>{selectedFloor === 'all' ? 'Toàn bộ nhà hàng' : selectedFloor}</Typography>
                                                <Typography variant="caption" color="text.secondary">Quản lý trạng thái và phiên phục vụ tại các bàn</Typography>
                                            </Box>
                                        </Grid>
                                        <Grid size={{ xs: 12, md: 8 }}>
                                            <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', justifyContent: { md: 'flex-end' } }}>
                                                {[
                                                    { label: 'Trống', color: '#10b981', count: tables.filter(t => (selectedFloor === 'all' || t.zone === selectedFloor) && t.status === 'AVAILABLE').length },
                                                    { label: 'Đang dùng', color: '#3b82f6', count: tables.filter(t => (selectedFloor === 'all' || t.zone === selectedFloor) && (t.status === 'OCCUPIED' || t.status === 'PAYMENT_REQUESTED' || t.status === 'WAITING_PAYMENT')).length },
                                                    { label: 'Cần hỗ trợ', color: '#ef4444', count: tables.filter(t => (selectedFloor === 'all' || t.zone === selectedFloor) && t.status === 'NEEDS_HELP').length },
                                                    { label: 'Vệ sinh', color: '#6366f1', count: tables.filter(t => (selectedFloor === 'all' || t.zone === selectedFloor) && t.status === 'CLEANING').length }
                                                ].map(s => (
                                                    <Box key={s.label} sx={{ textAlign: 'center' }}>
                                                        <Typography variant="h5" fontWeight={800} sx={{ color: s.color }}>{s.count}</Typography>
                                                        <Typography variant="caption" color="text.secondary" fontWeight={600}>{s.label}</Typography>
                                                    </Box>
                                                ))}
                                            </Box>
                                        </Grid>
                                    </Grid>
                                </SectionContainer>

                                {/* Tables Grid */}
                                <Grid container spacing={3} sx={{ mt: 1 }}>
                                    {tables
                                        .filter(t => selectedFloor === 'all' || t.zone === selectedFloor)
                                        .filter(t => !search || t.name.toLowerCase().includes(search.toLowerCase()))
                                        .map(t => {
                                            const isOccupied = t.status === 'OCCUPIED' || t.status === 'PAYMENT_REQUESTED' || t.status === 'WAITING_PAYMENT' || t.status === 'NEEDS_HELP';
                                            const statusColor =
                                                t.status === 'AVAILABLE' ? '#10b981' :
                                                    t.status === 'NEEDS_HELP' ? '#ef4444' :
                                                        t.status === 'CLEANING' ? '#6366f1' : '#3b82f6';

                                            return (
                                                <Grid key={t._id} size={{ xs: 6, sm: 4, md: 3, lg: 2, xl: 1.5 }}>
                                                    <Card sx={{
                                                        p: 0,
                                                        position: 'relative',
                                                        overflow: 'hidden',
                                                        borderRadius: 3,
                                                        border: '2px solid',
                                                        borderColor: isOccupied ? statusColor : 'transparent',
                                                        bgcolor: t.status === 'AVAILABLE' ? '#fff' : 'rgba(248, 250, 252, 0.8)',
                                                        transition: 'all 0.2s',
                                                        '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }
                                                    }}>
                                                        {/* Table Header/Indicator */}
                                                        <Box sx={{ p: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                            <Box sx={{ width: 32, height: 32, borderRadius: 2.5, bgcolor: 'rgba(0,0,0,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: t.tableType === 'VIP' ? '#f59e0b' : t.tableType === 'OUTDOOR' ? '#0ea5e9' : 'text.secondary' }}>
                                                                {t.tableType === 'VIP' ? <Star sx={{ fontSize: 18 }} /> : t.tableType === 'OUTDOOR' ? <Deck sx={{ fontSize: 18 }} /> : <ChairAlt sx={{ fontSize: 18 }} />}
                                                            </Box>
                                                            <Box sx={{ p: 0.5, borderRadius: '50%', bgcolor: statusColor, boxShadow: `0 0 8px ${statusColor}` }} />
                                                        </Box>

                                                        {/* Table Info */}
                                                        <Box sx={{ px: 2, pb: 2.5, textAlign: 'center' }}>
                                                            <Typography variant="h6" fontWeight={800} color={isOccupied ? statusColor : 'text.primary'}>{t.name}</Typography>
                                                            <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" sx={{ mb: 1.5 }}>{t.tableType} · {t.capacity} chỗ</Typography>

                                                            {isOccupied && t.currentSessionId && (
                                                                <Box sx={{ mb: 2, p: 1, bgcolor: 'rgba(0,0,0,0.03)', borderRadius: 2 }}>
                                                                    <Typography variant="caption" color="success.main" fontWeight={700}>{fmt(t.currentSessionId.totalAmount)}</Typography>
                                                                </Box>
                                                            )}

                                                            <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center', borderTop: '1px solid #f1f5f9', pt: 1.5 }}>
                                                                <IconButton size="small" onClick={(e) => { e.stopPropagation(); openQR(t); }} sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main', bgcolor: 'rgba(59, 130, 246, 0.1)' } }}><QrCode sx={{ fontSize: 18 }} /></IconButton>
                                                                <IconButton size="small" onClick={(e) => { e.stopPropagation(); openEdit('table', t as unknown as Record<string, unknown>); }} sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main', bgcolor: 'rgba(59, 130, 246, 0.1)' } }}><OpenInNew sx={{ fontSize: 18 }} /></IconButton>
                                                                <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleDelete('table', t._id); }} sx={{ color: 'text.secondary', '&:hover': { color: 'error.main', bgcolor: 'rgba(239, 68, 68, 0.1)' } }}><Close sx={{ fontSize: 18 }} /></IconButton>
                                                            </Box>
                                                        </Box>
                                                    </Card>
                                                </Grid>
                                            );
                                        })}
                                </Grid>
                            </Box>
                        )}

                        {/* ── STAFF REVAMP ── */}
                        {activeTab === 'staff' && (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                                {/* Filter Bar */}
                                <SectionContainer sx={{ py: 2 }}>
                                    <Grid container spacing={2} alignItems="center">
                                        <Grid size={{ xs: 12, md: 4 }}>
                                            <TextField
                                                fullWidth
                                                size="small"
                                                placeholder="Tìm theo tên hoặc email..."
                                                value={search}
                                                onChange={(e) => setSearch(e.target.value)}
                                            />
                                        </Grid>
                                        <Grid size={{ xs: 6, md: 3 }}>
                                            <TextField
                                                select
                                                fullWidth
                                                size="small"
                                                label="Vai trò"
                                                value={staffRoleFilter}
                                                onChange={(e) => setStaffRoleFilter(e.target.value)}
                                            >
                                                <MenuItem value="all">Tất cả vai trò</MenuItem>
                                                <MenuItem value="ADMIN">Admin</MenuItem>
                                                <MenuItem value="MANAGER">Quản lý</MenuItem>
                                                <MenuItem value="STAFF">Nhân viên</MenuItem>
                                            </TextField>
                                        </Grid>
                                        <Grid size={{ xs: 6, md: 3 }}>
                                            <TextField
                                                select
                                                fullWidth
                                                size="small"
                                                label="Trạng thái"
                                                value={staffStatusFilter}
                                                onChange={(e) => setStaffStatusFilter(e.target.value)}
                                            >
                                                <MenuItem value="all">Tất cả trạng thái</MenuItem>
                                                <MenuItem value="active">Đang hoạt động</MenuItem>
                                                <MenuItem value="inactive">Đã vô hiệu hoá</MenuItem>
                                            </TextField>
                                        </Grid>
                                        <Grid size={{ xs: 12, md: 2 }}>
                                            <PrimaryButton fullWidth onClick={() => openCreate('user')}>+ Thêm mới</PrimaryButton>
                                        </Grid>
                                    </Grid>
                                </SectionContainer>

                                {/* Staff Grid */}
                                <Grid container spacing={3}>
                                    {users.filter(u => {
                                        const matchSearch = u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
                                        const matchRole = staffRoleFilter === 'all' || u.role === staffRoleFilter;
                                        const matchStatus = staffStatusFilter === 'all' || (staffStatusFilter === 'active' ? u.isActive : !u.isActive);
                                        return matchSearch && matchRole && matchStatus && !u.isSystem;
                                    }).map(u => (
                                        <Grid key={u._id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                                            <SectionContainer sx={{
                                                position: 'relative',
                                                transition: 'all 0.3s ease',
                                                '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 12px 24px rgba(0,0,0,0.1)' },
                                                opacity: u.isActive ? 1 : 0.7,
                                                bgcolor: u.isActive ? 'background.paper' : '#f9fafb'
                                            }}>
                                                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 1.5 }}>
                                                    <Avatar
                                                        src={u.avatar}
                                                        sx={{ width: 80, height: 80, mb: 1, border: '4px solid #fff', boxShadow: '0 4px 10px rgba(0,0,0,0.1)', cursor: 'pointer' }}
                                                        onClick={() => handleViewStaffDetail(u)}
                                                    >
                                                        {u.name.charAt(0).toUpperCase()}
                                                    </Avatar>

                                                    <Box>
                                                        <Typography variant="subtitle1" fontWeight={700}>{u.name}</Typography>
                                                        <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: 'center' }}>
                                                            <Email sx={{ fontSize: 12 }} /> {u.email}
                                                        </Typography>
                                                    </Box>

                                                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'center' }}>
                                                        <Typography variant="caption" sx={{ px: 1.5, py: 0.5, borderRadius: 20, fontWeight: 600, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em', bgcolor: u.role === 'ADMIN' ? '#fee2e2' : u.role === 'MANAGER' ? '#dbeafe' : '#f0fdf4', color: u.role === 'ADMIN' ? '#991b1b' : u.role === 'MANAGER' ? '#1e40af' : '#166534' }}>
                                                            {u.role}
                                                        </Typography>
                                                        <Typography variant="caption" sx={{ px: 1.5, py: 0.5, borderRadius: 20, fontWeight: 600, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em', bgcolor: u.isActive ? '#ecfdf5' : '#f3f4f6', color: u.isActive ? '#059669' : '#6b7280' }}>
                                                            {u.isActive ? 'Active' : 'Bị khoá'}
                                                        </Typography>
                                                    </Box>

                                                    <Box sx={{ display: 'flex', gap: 1, mt: 2, width: '100%', pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                                                        <Button size="small" variant="text" sx={{ flex: 1, fontSize: 11 }} onClick={() => handleViewStaffDetail(u)}>Chi tiết</Button>
                                                        <IconButton size="small" onClick={() => handleResetStaffPwd(u)}><Refresh sx={{ fontSize: 18 }} /></IconButton>
                                                        <IconButton size="small" onClick={() => openEdit('user', u as unknown as Record<string, unknown>)}><OpenInNew sx={{ fontSize: 18 }} /></IconButton>
                                                        <IconButton size="small" color={u.isActive ? 'warning' : 'success'} onClick={() => handleToggleStaffActive(u)}>
                                                            {u.isActive ? <Block sx={{ fontSize: 18 }} /> : <CheckCircle sx={{ fontSize: 18 }} />}
                                                        </IconButton>
                                                    </Box>
                                                </Box>
                                            </SectionContainer>
                                        </Grid>
                                    ))}
                                </Grid>
                            </Box>
                        )}

                        {/* ── INVOICES ── */}
                        {activeTab === 'invoices' && (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                                <Grid container spacing={2}>
                                    <Grid size={{ xs: 12, md: 4 }}>
                                        <StatCard title="Tổng Doanh Thu HĐ Đóng" value={fmt(sessions.reduce((s: number, x: SessionData) => s + (x.totalAmount || 0), 0))} icon="💰" color="#059669" bgcolor="#ecfdf5" />
                                    </Grid>
                                    <Grid size={{ xs: 12, md: 4 }}>
                                        <StatCard title="Qua Chuyển Khoản" value={fmt(sessions.filter((s: SessionData) => s.paymentMethod === 'BANK').reduce((s: number, x: SessionData) => s + (x.totalAmount || 0), 0))} icon="🏦" color="#2563eb" bgcolor="#eff6ff" />
                                    </Grid>
                                    <Grid size={{ xs: 12, md: 4 }}>
                                        <StatCard title="Bằng Tiền Mặt" value={fmt(sessions.filter((s: SessionData) => s.paymentMethod === 'CASH').reduce((s: number, x: SessionData) => s + (x.totalAmount || 0), 0))} icon="💵" color="#d97706" bgcolor="#fef3c7" />
                                    </Grid>
                                </Grid>
                                <SectionContainer>
                                    <Typography variant="h6" sx={{ mb: 2 }}>Danh sách hoá đơn ({sessions.length})</Typography>
                                    {sessions.map((s: SessionData) => (
                                        <Box key={s._id} onClick={() => handleViewInvoice(s._id)} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, borderBottom: '1px solid #f5f5f5', cursor: 'pointer', '&:hover': { bgcolor: '#f9fafb' } }}>
                                            <Box>
                                                <Typography variant="subtitle2" fontWeight={600}>{typeof s.tableId === 'object' ? s.tableId.name : s._id.slice(-6)}</Typography>
                                                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>{new Date(s.startedAt).toLocaleString('vi-VN')} {s.paymentMethod && `· ${s.paymentMethod === 'BANK' ? 'Chuyển khoản' : 'Tiền mặt'}`}</Typography>
                                                {s.payment?.confirmedBy && (
                                                    <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                                                        <Box sx={{ width: 24, height: 24, borderRadius: '50%', bgcolor: 'primary.main', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 10, fontWeight: 700 }}>
                                                            {s.payment.confirmedBy.name.charAt(0).toUpperCase()}
                                                        </Box>
                                                        <Typography variant="caption" sx={{ fontWeight: 600, color: '#16a34a' }}>
                                                            {s.payment.confirmedBy.name}
                                                        </Typography>
                                                    </Box>
                                                )}
                                            </Box>
                                            <Box sx={{ textAlign: 'right' }}>
                                                <Typography variant="subtitle2" color="success.main" fontWeight={700}>{fmt(s.totalAmount || 0)}</Typography>
                                                {s.payment?.receiptImage && (
                                                    <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', mt: 0.5 }}>📸 Có ảnh</Typography>
                                                )}
                                            </Box>
                                        </Box>
                                    ))}
                                </SectionContainer>
                            </Box>
                        )}

                        {activeTab === 'reports' && (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                <SectionContainer>
                                    <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>📊 Tổng quan ngày hôm nay</Typography>
                                    <Grid container spacing={3}>
                                        <Grid size={{ xs: 12, md: 4 }}>
                                            <StatCard title="Doanh thu hôm nay" value={fmt(stats?.todayRevenue || 0)} icon={<TrendingUp />} color="#10b981" bgcolor="rgba(16, 185, 129, 0.1)" />
                                        </Grid>
                                        <Grid size={{ xs: 12, md: 4 }}>
                                            <StatCard title="Tiền mặt" value={fmt(stats?.revenueByMethod?.CASH || 0)} icon={<Payment />} color="#f59e0b" bgcolor="rgba(245, 158, 11, 0.1)" />
                                        </Grid>
                                        <Grid size={{ xs: 12, md: 4 }}>
                                            <StatCard title="Chuyển khoản" value={fmt(stats?.revenueByMethod?.BANK || 0)} icon={<EventAvailable />} color="#3b82f6" bgcolor="rgba(59, 130, 246, 0.1)" />
                                        </Grid>
                                    </Grid>
                                </SectionContainer>

                                <Grid container spacing={3}>
                                    <Grid size={{ xs: 12, md: 6 }}>
                                        <SectionContainer>
                                            <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>⭐ Top Nhân viên xuất sắc</Typography>
                                            {stats?.topEmployees && stats.topEmployees.length > 0 ? (
                                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                                    {stats.topEmployees.map((emp, idx) => (
                                                        <Box key={emp.id} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider', bgcolor: idx === 0 ? 'rgba(234, 179, 8, 0.05)' : 'transparent' }}>
                                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                                                <Avatar sx={{ bgcolor: idx === 0 ? '#eab308' : 'primary.main', width: 40, height: 40 }}>
                                                                    {idx === 0 ? <Star /> : emp.name.charAt(0).toUpperCase()}
                                                                </Avatar>
                                                                <Box>
                                                                    <Typography variant="subtitle2" fontWeight={700}>{emp.name}</Typography>
                                                                    <Typography variant="caption" color="text.secondary">{emp.count} giao dịch</Typography>
                                                                </Box>
                                                            </Box>
                                                            <Typography variant="subtitle1" fontWeight={800} color="primary">{fmt(emp.total)}</Typography>
                                                        </Box>
                                                    ))}
                                                </Box>
                                            ) : (
                                                <Box sx={{ p: 4, textAlign: 'center' }}><Typography color="text.secondary">Chưa có dữ liệu giao dịch</Typography></Box>
                                            )}
                                        </SectionContainer>
                                    </Grid>

                                    <Grid size={{ xs: 12, md: 6 }}>
                                        <SectionContainer>
                                            <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>📈 Top món bán chạy</Typography>
                                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                                {stats?.topItems.slice(0, 5).map((item, idx: number) => (
                                                    <Box key={idx} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1.5, borderRadius: 2, bgcolor: '#f9fafb' }}>
                                                        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                                                            <Typography variant="subtitle2" fontWeight={700} sx={{ width: 24, color: 'text.disabled' }}>{idx + 1}</Typography>
                                                            <Typography variant="body2">{item.name}</Typography>
                                                        </Box>
                                                        <Typography variant="body2" fontWeight={700}>{item.count} món</Typography>
                                                    </Box>
                                                ))}
                                            </Box>
                                        </SectionContainer>
                                    </Grid>
                                </Grid>

                                <Box sx={{ display: 'flex', justifyContent: 'center', pb: 4 }}>
                                    <PrimaryButton startIcon={<Download />} onClick={() => window.print()} sx={{ px: 4 }}>Xuất báo cáo ngày</PrimaryButton>
                                </Box>
                            </Box>
                        )}
                    </Box>
                </Box>

                {/* ── Form Modal ── */}
                <FormModal open={showModal} onClose={() => setShowModal(false)} title={modalType === 'profile' ? 'Cài đặt tài khoản' : editingItem ? 'Chỉnh sửa' : 'Tạo mới'} onSave={handleSave}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
                        {modalType !== 'profile' && <TextField label="Tên" value={(formData.name as string) || ''} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} />}
                        {modalType === 'category' && (<>
                            <TextField label="Mô tả" value={(formData.description as string) || ''} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} />
                            <TextField label="Thứ tự" type="number" value={(formData.sortOrder as number) || 0} onChange={e => setFormData(p => ({ ...p, sortOrder: Number(e.target.value) }))} />
                        </>)}
                        {modalType === 'product' && (<>
                            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1 }}>
                                <ImageUpload
                                    value={(formData.image as string) || undefined}
                                    onChange={url => setFormData(p => ({ ...p, image: url || '' }))}
                                    folder="products"
                                    shape="square"
                                    size={140}
                                />
                            </Box>
                            <TextField label="Mô tả" value={(formData.description as string) || ''} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} />
                            <TextField label="Giá (VND)" type="number" value={(formData.price as number) || 0} onChange={e => setFormData(p => ({ ...p, price: Number(e.target.value) }))} />
                            <TextField label="Danh mục" select value={(formData.categoryId as string) || ''} onChange={e => setFormData(p => ({ ...p, categoryId: e.target.value }))}>
                                {categories.map(c => <MenuItem key={c._id} value={c._id}>{c.name}</MenuItem>)}
                            </TextField>
                        </>)}
                        {modalType === 'table' && (<>
                            <TextField label="Loại bàn" select value={(formData.tableType as string) || 'REGULAR'} onChange={e => setFormData(p => ({ ...p, tableType: e.target.value }))}>
                                <MenuItem value="REGULAR">Thường</MenuItem><MenuItem value="VIP">VIP</MenuItem>
                                <MenuItem value="OUTDOOR">Ngoài trời</MenuItem><MenuItem value="PRIVATE">Phòng riêng</MenuItem>
                                <MenuItem value="BAR">Quầy bar</MenuItem>
                            </TextField>
                            <TextField label="Khu vực" value={(formData.zone as string) || ''} onChange={e => setFormData(p => ({ ...p, zone: e.target.value }))} />
                            <TextField label="Sức chứa" type="number" value={(formData.capacity as number) || 4} onChange={e => setFormData(p => ({ ...p, capacity: Number(e.target.value) }))} />
                        </>)}
                        {modalType === 'user' && (<>
                            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1 }}>
                                <ImageUpload
                                    value={(formData.avatar as string) || undefined}
                                    onChange={url => setFormData(p => ({ ...p, avatar: url || '' }))}
                                    folder="avatars"
                                    shape="circle"
                                    size={100}
                                />
                            </Box>
                            <TextField label="Email" type="email" value={(formData.email as string) || ''} onChange={e => setFormData(p => ({ ...p, email: e.target.value }))} disabled={!!editingItem} />
                            {!editingItem && <TextField label="Mật khẩu" type="password" value={(formData.password as string) || ''} onChange={e => setFormData(p => ({ ...p, password: e.target.value }))} />}
                            <TextField label="Vai trò" select value={(formData.role as string) || 'STAFF'} onChange={e => setFormData(p => ({ ...p, role: e.target.value }))}>
                                <MenuItem value="STAFF">Nhân viên</MenuItem><MenuItem value="MANAGER">Quản lý</MenuItem><MenuItem value="ADMIN">Admin</MenuItem>
                            </TextField>
                        </>)}
                        {modalType === 'profile' && (<>
                            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1 }}>
                                <ImageUpload
                                    value={(formData.avatar as string) || undefined}
                                    onChange={url => setFormData(p => ({ ...p, avatar: url || '' }))}
                                    folder="avatars"
                                    shape="circle"
                                    size={100}
                                />
                            </Box>
                            <TextField label="Tên hiển thị" value={(formData.name as string) || ''} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} />
                            <TextField label="Mật khẩu mới" placeholder="Để trống nếu không đổi" type="password" value={(formData.password as string) || ''} onChange={e => setFormData(p => ({ ...p, password: e.target.value }))} />
                        </>)}
                    </Box>
                </FormModal>

                {/* ── QR Dialog ── */}
                <Dialog open={!!qrTable} onClose={() => { setQrTable(null); setQrDataUrl(null); }} maxWidth="xs">
                    <DialogContent sx={{ textAlign: 'center', pt: 3, pb: 2, px: 3 }}>
                        <Typography variant="h6" sx={{ mb: 0.5 }}>{qrTable?.name}</Typography>
                        <Typography variant="caption" display="block" sx={{ mb: 2 }}>Quét mã để đặt món</Typography>
                        <Box sx={{ bgcolor: '#f9fafb', p: 2, borderRadius: 2, display: 'inline-block', mb: 2 }}>
                            {qrLoading ? <CircularProgress /> : qrDataUrl && <img src={qrDataUrl} alt="QR" width={128} height={128} style={{ display: 'block' }} />}
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                            <Button variant="contained" color="primary" fullWidth startIcon={<Download />} onClick={() => qrTable && dlQR(qrTable)}>Tải QR</Button>
                            <Button variant="outlined" fullWidth startIcon={<OpenInNew />} onClick={() => { if (qrTable) window.open(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/order/${qrTable._id}`, '_blank'); }}>Mở link</Button>
                        </Box>
                    </DialogContent>
                </Dialog>

                {/* ── Invoice Dialog ── */}
                <Dialog open={!!viewInvoiceId} onClose={() => setViewInvoiceId(null)} maxWidth="sm" fullWidth>
                    <DialogContent sx={{ p: 0 }}>
                        {!invoiceDetails ? (
                            <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress /></Box>
                        ) : (
                            <Box sx={{ p: 3 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                                    <Typography variant="h6">Chi tiết Hoá Đơn</Typography>
                                    <IconButton onClick={() => setViewInvoiceId(null)} size="small" sx={{ p: 0.5 }}><Close fontSize="small" /></IconButton>
                                </Box>
                                <Box sx={{ mb: 3 }}>
                                    <Typography variant="body2" color="text.secondary" gutterBottom><b>Bàn:</b> {invoiceDetails.tableId?.name}</Typography>
                                    <Typography variant="body2" color="text.secondary" gutterBottom><b>Mở lúc:</b> {invoiceDetails.startedAt ? new Date(invoiceDetails.startedAt).toLocaleString('vi-VN') : ''}</Typography>
                                    <Typography variant="body2" color="text.secondary" gutterBottom><b>Đóng lúc:</b> {invoiceDetails.endedAt ? new Date(invoiceDetails.endedAt).toLocaleString('vi-VN') : 'Đang mở'}</Typography>
                                    <Typography variant="body2" color="text.secondary" gutterBottom><b>Hình thức thanh toán:</b> {invoiceDetails.paymentMethod === 'BANK' ? 'Chuyển khoản' : invoiceDetails.paymentMethod === 'CASH' ? 'Tiền mặt' : 'Chưa ghi nhận'}</Typography>
                                </Box>

                                <Typography variant="subtitle2" sx={{ mb: 1.5 }}>Các món đã Order:</Typography>
                                <Box sx={{ p: 2, bgcolor: '#f9fafb', borderRadius: 2, mb: 3 }}>
                                    {invoiceDetails.orders?.map(o => (
                                        <Box key={o._id} sx={{ mb: 2 }}>
                                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>Order lúc: {new Date(o.createdAt).toLocaleTimeString('vi-VN')} · Tạo bởi: {o.creatorName || o.createdBy}</Typography>
                                            {o.items.map((item, idx) => (
                                                <Box key={idx} sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                                    <Typography variant="body2">{item.quantity}x {item.name}</Typography>
                                                    <Typography variant="body2" fontWeight={500}>{fmt(item.price * item.quantity)}</Typography>
                                                </Box>
                                            ))}
                                        </Box>
                                    ))}
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 2, mt: 1, borderTop: '1px solid #e5e7eb' }}>
                                        <Typography variant="subtitle2" fontWeight={700}>TỔNG CỘNG</Typography>
                                        <Typography variant="subtitle2" color="primary" fontWeight={800}>{fmt(invoiceDetails.totalAmount || 0)}</Typography>
                                    </Box>
                                </Box>

                                {invoiceDetails.payment && (
                                    <Box>
                                        <Typography variant="subtitle2" sx={{ mb: 1.5 }}>Thông tin thu tiền:</Typography>
                                        <Box sx={{ p: 2, border: '1px solid #e5e7eb', borderRadius: 2, bgcolor: '#f0fdf4', borderColor: '#bcf0da' }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                                                <Box sx={{ width: 32, height: 32, borderRadius: '50%', bgcolor: 'primary.main', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 14, fontWeight: 700 }}>
                                                    {invoiceDetails.payment.confirmedBy?.name ? invoiceDetails.payment.confirmedBy.name.charAt(0).toUpperCase() : '?'}
                                                </Box>
                                                <Box>
                                                    <Typography variant="body2" fontWeight={700} color="#16a34a">{invoiceDetails.payment.confirmedBy?.name || 'Không xác định'}</Typography>
                                                    <Typography variant="caption" color="text.secondary" display="block">{invoiceDetails.payment.confirmedBy?.email}</Typography>
                                                </Box>
                                            </Box>
                                            <Typography variant="caption" display="block" color="text.secondary"><b>Xác nhận lúc:</b> {invoiceDetails.payment.paidAt ? new Date(invoiceDetails.payment.paidAt).toLocaleString('vi-VN') : 'Chưa xác nhận'}</Typography>
                                            {invoiceDetails.payment.receiptImage && (
                                                <Box sx={{ mt: 2, textAlign: 'center' }}>
                                                    <Typography variant="caption" display="block" sx={{ mb: 1 }}>Ảnh hoá đơn/CK đính kèm:</Typography>
                                                    <img src={invoiceDetails.payment.receiptImage} alt="Receipt" style={{ maxWidth: '100%', maxHeight: 300, borderRadius: 8 }} />
                                                    <Box sx={{ mt: 1 }}>
                                                        <Button size="small" variant="text" startIcon={<OpenInNew />} onClick={() => window.open(invoiceDetails.payment?.receiptImage, '_blank')}>Mở lớn</Button>
                                                    </Box>
                                                </Box>
                                            )}
                                        </Box>
                                    </Box>
                                )}
                            </Box>
                        )}
                    </DialogContent>
                </Dialog>

                {/* ── Staff Detail Dialog ── */}
                <Dialog open={!!staffDetail} onClose={() => setStaffDetail(null)} maxWidth="sm" fullWidth>
                    <DialogContent sx={{ p: 0 }}>
                        {staffDetail && (
                            <Box>
                                {/* Header with background */}
                                <Box sx={{ height: 120, bgcolor: 'primary.main', position: 'relative' }}>
                                    <IconButton onClick={() => setStaffDetail(null)} sx={{ position: 'absolute', top: 8, right: 8, color: '#fff' }}><Close /></IconButton>
                                </Box>
                                <Box sx={{ px: 3, pb: 3, position: 'relative', mt: -6 }}>
                                    <Avatar src={staffDetail.avatar} sx={{ width: 100, height: 100, border: '4px solid #fff', mb: 2 }}>{staffDetail.name.charAt(0)}</Avatar>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 2 }}>
                                        <Box>
                                            <Typography variant="h5" fontWeight={800}>{staffDetail.name}</Typography>
                                            <Typography variant="body2" color="text.secondary">{staffDetail.email} · {staffDetail.role}</Typography>
                                        </Box>
                                        <Box sx={{ display: 'flex', gap: 1 }}>
                                            <OutlinedButton size="small" onClick={() => handleToggleStaffActive(staffDetail)}>{staffDetail.isActive ? 'Vô hiệu hoá' : 'Kích hoạt'}</OutlinedButton>
                                            <PrimaryButton size="small" onClick={() => { setStaffDetail(null); openEdit('user', staffDetail as unknown as Record<string, unknown>); }}>Chỉnh sửa</PrimaryButton>
                                        </Box>
                                    </Box>

                                    <Divider sx={{ my: 3 }} />

                                    <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>Hiệu suất làm việc</Typography>

                                    {isFetchingStaffStats ? (
                                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={32} /></Box>
                                    ) : staffStats ? (
                                        <Grid container spacing={2}>
                                            <Grid size={{ xs: 6, sm: 4 }}>
                                                <Box sx={{ p: 2, bgcolor: '#f0fdf4', borderRadius: 2, textAlign: 'center' }}>
                                                    <Typography variant="caption" color="#166534" fontWeight={600} display="block">Doanh thu xác nhận</Typography>
                                                    <Typography variant="subtitle1" fontWeight={800} color="#166534">{fmt(staffStats.totalRevenue)}</Typography>
                                                </Box>
                                            </Grid>
                                            <Grid size={{ xs: 6, sm: 4 }}>
                                                <Box sx={{ p: 2, bgcolor: '#eff6ff', borderRadius: 2, textAlign: 'center' }}>
                                                    <Typography variant="caption" color="#1e40af" fontWeight={600} display="block">Hôm nay (Doanh thu)</Typography>
                                                    <Typography variant="subtitle1" fontWeight={800} color="#1e40af">{fmt(staffStats.todayRevenue)}</Typography>
                                                </Box>
                                            </Grid>
                                            <Grid size={{ xs: 6, sm: 4 }}>
                                                <Box sx={{ p: 2, bgcolor: '#fff7ed', borderRadius: 2, textAlign: 'center' }}>
                                                    <Typography variant="caption" color="#9a3412" fontWeight={600} display="block">Order đã tạo</Typography>
                                                    <Typography variant="subtitle1" fontWeight={800} color="#9a3412">{staffStats.totalOrders}</Typography>
                                                </Box>
                                            </Grid>
                                        </Grid>
                                    ) : (
                                        <Typography variant="caption" color="text.secondary">Chưa có dữ liệu thống kê cho nhân viên này.</Typography>
                                    )}

                                    <Box sx={{ mt: 4 }}>
                                        <Typography variant="subtitle2" sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}><CalendarToday sx={{ fontSize: 16 }} /> Thông tin chi tiết</Typography>
                                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', pb: 1, borderBottom: '1px solid #f3f4f6' }}>
                                                <Typography variant="caption" color="text.secondary">Ngày tham gia</Typography>
                                                <Typography variant="caption" fontWeight={600}>{new Date(staffDetail.createdAt).toLocaleDateString('vi-VN')}</Typography>
                                            </Box>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', pb: 1, borderBottom: '1px solid #f3f4f6' }}>
                                                <Typography variant="caption" color="text.secondary">Trạng thái tài khoản</Typography>
                                                <Typography variant="caption" fontWeight={600} color={staffDetail.isActive ? 'success.main' : 'error.main'}>{staffDetail.isActive ? 'Đang hoạt động' : 'Đã khoá'}</Typography>
                                            </Box>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', pb: 1 }}>
                                                <Typography variant="caption" color="text.secondary">ID nhân viên</Typography>
                                                <Typography variant="caption" fontWeight={600}>{staffDetail._id}</Typography>
                                            </Box>
                                        </Box>
                                    </Box>
                                </Box>
                            </Box>
                        )}
                    </DialogContent>
                </Dialog>

                {/* ── Snackbar ── */}
                <Snackbar open={!!notification} autoHideDuration={3000} onClose={() => setNotification(null)} anchorOrigin={{ vertical: 'top', horizontal: 'right' }}>
                    <Alert severity={notification?.severity || 'success'} variant="filled" onClose={() => setNotification(null)}>
                        {notification?.msg}
                    </Alert>
                </Snackbar>
            </Box>
        </ThemeRegistry>
    );
}
