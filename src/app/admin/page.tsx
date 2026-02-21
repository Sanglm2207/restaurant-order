/* eslint-disable @next/next/no-img-element */
'use client';

import { useEffect, useState } from 'react';
import {
    Box, Typography, Grid, TextField, MenuItem, Snackbar, Alert,
    CircularProgress, Dialog, DialogContent, IconButton,
    Button,
} from '@mui/material';
import { QrCode, Download, OpenInNew, Close } from '@mui/icons-material';
import {
    ThemeRegistry, AppSidebar, AppHeader, ImageUpload,
    StatCard, ProductCard, FormModal, SectionContainer,
    PrimaryButton, OutlinedButton, CategoryChip,
} from '@/components/admin';
import type { AdminTab } from '@/components/admin';
import { useStore, TableData, UserData, ProductData } from '@/store';

type ModalType = 'category' | 'product' | 'table' | 'user' | 'profile';

export default function AdminDashboard() {
    const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedCat, setSelectedCat] = useState('all');

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
    }, []);

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
        try { const d = await (await fetch(`/api/tables/${t._id}/qrcode`)).json(); if (d.success) setQrDataUrl(d.data); } catch { notify('Lỗi tạo QR', 'error'); }
        setQrLoading(false);
    };

    const dlQR = (table: TableData) => {
        const a = document.createElement('a'); a.href = `/api/tables/${table._id}/qrcode`; a.download = `QR-${table.name.replace(/\s+/g, '-')}.png`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a); notify('Đã tải ảnh QR');
    };

    const tabLabels: Record<AdminTab, string> = { dashboard: 'Dashboard', menu: 'Menu', tables: 'Quản lý bàn', staff: 'Nhân viên', invoices: 'Hoá đơn' };

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
                        {/* ── DASHBOARD ── */}
                        {activeTab === 'dashboard' && stats && (
                            <Box sx={{ maxWidth: 1000 }}>
                                <Grid container spacing={2} sx={{ mb: 3 }}>
                                    <Grid size={{ xs: 6, md: 3 }}><StatCard title="Doanh thu" value={fmt(stats.totalRevenue)} icon="💰" color="#059669" bgcolor="#ecfdf5" /></Grid>
                                    <Grid size={{ xs: 6, md: 3 }}><StatCard title="Session hôm nay" value={stats.todaySessions} icon="📅" color="#2563eb" bgcolor="#eff6ff" /></Grid>
                                    <Grid size={{ xs: 6, md: 3 }}><StatCard title="Đang phục vụ" value={stats.activeSessions} icon="🍽️" color="#ea580c" bgcolor="#fff7ed" /></Grid>
                                    <Grid size={{ xs: 6, md: 3 }}><StatCard title="Thanh toán" value={stats.totalPayments} icon="💳" color="#7c3aed" bgcolor="#f5f3ff" /></Grid>
                                </Grid>
                                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>

                                    <SectionContainer>
                                        <Typography variant="subtitle1" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>📈 Món bán chạy</Typography>
                                        {stats.topItems.length === 0 ? (
                                            <Box sx={{ textAlign: 'center', py: 4 }}>
                                                <Typography color="text.secondary">Chưa có dữ liệu thống kê</Typography>
                                                <Typography variant="caption">Dữ liệu sẽ xuất hiện khi có đơn hàng hoàn thành</Typography>
                                            </Box>
                                        ) : stats.topItems.map((item, i) => (
                                            <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', py: 1, borderBottom: '1px solid #f5f5f5' }}>
                                                <Typography variant="body2">{i + 1}. {item.name} × {item.count}</Typography>
                                                <Typography variant="body2" color="primary" fontWeight={600}>{fmt(item.revenue)}</Typography>
                                            </Box>
                                        ))}
                                    </SectionContainer>

                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                                        <SectionContainer>
                                            <Typography variant="subtitle1" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>🍽️ Tình trạng bàn</Typography>
                                            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                                                <Box sx={{ p: 2, borderRadius: 2, bgcolor: '#eff6ff', border: '1px solid #bfdbfe', flex: 1, minWidth: 100 }}>
                                                    <Typography variant="body2" color="#1e3a8a" fontWeight={600}>Bàn trống</Typography>
                                                    <Typography variant="h5" color="#1d4ed8" fontWeight={700}>{tables.filter(t => t.status === 'AVAILABLE').length}</Typography>
                                                </Box>
                                                <Box sx={{ p: 2, borderRadius: 2, bgcolor: '#fef3c7', border: '1px solid #fde68a', flex: 1, minWidth: 100 }}>
                                                    <Typography variant="body2" color="#92400e" fontWeight={600}>Có khách</Typography>
                                                    <Typography variant="h5" color="#b45309" fontWeight={700}>{tables.filter(t => t.status === 'OCCUPIED' || t.status === 'PAYMENT_REQUESTED' || t.status === 'WAITING_PAYMENT').length}</Typography>
                                                </Box>
                                                <Box sx={{ p: 2, borderRadius: 2, bgcolor: '#fef2f2', border: '1px solid #fecaca', flex: 1, minWidth: 100 }}>
                                                    <Typography variant="body2" color="#991b1b" fontWeight={600}>Cần hỗ trợ</Typography>
                                                    <Typography variant="h5" color="#b91c1c" fontWeight={700}>{tables.filter(t => t.status === 'NEEDS_HELP').length}</Typography>
                                                </Box>
                                            </Box>
                                        </SectionContainer>

                                        <SectionContainer>
                                            <Typography variant="subtitle1" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>⌛ Đơn hàng đang chờ</Typography>
                                            {pendingOrders.length === 0 ? (
                                                <Box sx={{ textAlign: 'center', py: 3 }}>
                                                    <Typography color="text.secondary">Không có đơn hàng nào</Typography>
                                                </Box>
                                            ) : (
                                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                                    {pendingOrders.slice(0, 5).map(o => (
                                                        <Box key={o._id} sx={{ p: 1.5, border: '1px solid #e5e7eb', borderRadius: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                            <Box>
                                                                <Typography variant="body2" fontWeight={600}>{tables.find(t => t.currentSessionId?._id === o.sessionId)?.name || 'Bàn'}</Typography>
                                                                <Typography variant="caption" color="text.secondary">{new Date(o.createdAt).toLocaleTimeString('vi-VN')} · {o.items.length} món</Typography>
                                                            </Box>
                                                            <Typography variant="caption" sx={{ px: 1, py: 0.5, bgcolor: '#fef3c7', color: '#b45309', borderRadius: 1, fontWeight: 600 }}>Chờ nấu</Typography>
                                                        </Box>
                                                    ))}
                                                    {pendingOrders.length > 5 && (
                                                        <Button variant="text" size="small" onClick={() => setActiveTab('staff')}>Xem thêm...</Button>
                                                    )}
                                                </Box>
                                            )}
                                        </SectionContainer>
                                    </Box>
                                </Box>
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

                        {/* ── TABLES ── */}
                        {activeTab === 'tables' && (
                            <SectionContainer>
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', mb: 3 }}>
                                    <PrimaryButton onClick={() => openCreate('table')}>+ Tạo bàn mới</PrimaryButton>
                                </Box>
                                <Grid container spacing={2}>
                                    {tables.filter(t => !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.zone.toLowerCase().includes(search.toLowerCase())).map(t => (
                                        <Grid key={t._id} size={{ xs: 6, sm: 4, md: 3, lg: 2 }}>
                                            <SectionContainer sx={{ textAlign: 'center', cursor: 'pointer', '&:hover': { boxShadow: '0 4px 12px rgba(0,0,0,0.08)' } }}>
                                                <Typography variant="subtitle2" fontWeight={600}>{t.name}</Typography>
                                                <Typography variant="caption" display="block" sx={{ mb: 1 }}>{t.zone} · {t.capacity} chỗ</Typography>
                                                <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                                                    <IconButton size="small" onClick={() => openQR(t)}><QrCode sx={{ fontSize: 16 }} /></IconButton>
                                                    <IconButton size="small" onClick={() => openEdit('table', t as unknown as Record<string, unknown>)}><OpenInNew sx={{ fontSize: 16 }} /></IconButton>
                                                    <IconButton size="small" color="error" onClick={() => handleDelete('table', t._id)}><Close sx={{ fontSize: 16 }} /></IconButton>
                                                </Box>
                                            </SectionContainer>
                                        </Grid>
                                    ))}
                                </Grid>
                            </SectionContainer>
                        )}

                        {/* ── STAFF ── */}
                        {activeTab === 'staff' && (
                            <SectionContainer>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                                    <Typography variant="h6">Nhân viên ({users.length})</Typography>
                                    <PrimaryButton onClick={() => openCreate('user')}>+ Thêm nhân viên</PrimaryButton>
                                </Box>
                                <Grid container spacing={2}>
                                    {users.filter(u => !u.isSystem).map(u => (
                                        <Grid key={u._id} size={{ xs: 12, sm: 6, md: 4 }}>
                                            <SectionContainer sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <Box>
                                                    <Typography variant="subtitle2" fontWeight={600}>{u.name}</Typography>
                                                    <Typography variant="caption">{u.email}</Typography>
                                                    <Box sx={{ mt: 0.5 }}>
                                                        <Typography variant="caption" sx={{ px: 1, py: 0.25, borderRadius: 1, bgcolor: u.role === 'ADMIN' ? '#fef2f2' : u.role === 'MANAGER' ? '#eff6ff' : '#f0fdf4', color: u.role === 'ADMIN' ? '#dc2626' : u.role === 'MANAGER' ? '#2563eb' : '#16a34a', fontWeight: 500 }}>
                                                            {u.role}
                                                        </Typography>
                                                    </Box>
                                                </Box>
                                                <Box sx={{ display: 'flex', gap: 0.5 }}>
                                                    <Button size="small" onClick={() => openEdit('user', u as unknown as Record<string, unknown>)}>Sửa</Button>
                                                    {!u.isSystem && <Button size="small" color="error" onClick={() => handleDelete('user', u._id)}>Xoá</Button>}
                                                </Box>
                                            </SectionContainer>
                                        </Grid>
                                    ))}
                                </Grid>
                            </SectionContainer>
                        )}

                        {/* ── INVOICES ── */}
                        {activeTab === 'invoices' && (
                            <SectionContainer>
                                <Typography variant="h6" sx={{ mb: 2 }}>Hoá đơn ({sessions.length})</Typography>
                                {sessions.map(s => (
                                    <Box key={s._id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1.5, borderBottom: '1px solid #f5f5f5' }}>
                                        <Box>
                                            <Typography variant="subtitle2">{typeof s.tableId === 'object' ? s.tableId.name : s._id.slice(-6)}</Typography>
                                            <Typography variant="caption">{new Date(s.startedAt).toLocaleString('vi-VN')} {s.paymentMethod && `· ${s.paymentMethod}`}</Typography>
                                        </Box>
                                        <Typography variant="subtitle2" color="primary" fontWeight={700}>{fmt(s.totalAmount)}</Typography>
                                    </Box>
                                ))}
                            </SectionContainer>
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
