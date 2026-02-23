'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { WSEventType, type WSMessage } from '@/types';
import { ThemeProvider, createTheme, CssBaseline, Box, Typography, Button, IconButton, Paper, Tabs, Tab, Dialog, Snackbar, Alert, CircularProgress, Avatar, Menu, MenuItem, ListItemIcon, Divider, TextField, Select } from '@mui/material';
import { Close, Refresh, Restaurant, Logout, Person } from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { useStore, TableData, OrderData, UserData } from '@/store';
import { ImageUpload } from '@/components/admin';

// Types
type TabType = 'tables' | 'orders' | 'alerts';

const STATUS_MAP: Record<string, { label: string; color: string; dot: string; }> = {
    AVAILABLE: { label: 'Trống', color: '#18181b', dot: '#52525b' },
    OCCUPIED: { label: 'Đang có khách', color: '#18181b', dot: '#3b82f6' },
    NEEDS_HELP: { label: 'Cần hỗ trợ', color: 'rgba(239, 68, 68, 0.1)', dot: '#ef4444' },
    PAYMENT_REQUESTED: { label: 'Chờ thanh toán', color: '#18181b', dot: '#a855f7' },
    CLEANING: { label: 'Chờ dọn dẹp', color: '#18181b', dot: '#f59e0b' },
};

const fmt = (price: number) => new Intl.NumberFormat('vi-VN').format(price) + 'đ';

export default function StaffDashboard() {
    const theme = useMemo(() => createTheme({
        palette: { mode: 'dark', primary: { main: '#f97316' }, background: { default: '#050505', paper: '#111111' }, text: { primary: '#f4f4f5', secondary: '#a1a1aa' } },
        typography: { fontFamily: 'Inter, sans-serif' },
        shape: { borderRadius: 12 },
        components: { MuiButton: { styleOverrides: { root: { textTransform: 'none', fontWeight: 600 } } } }
    }), []);

    const { tables, pendingOrders, products, fetchTables, fetchPendingOrders, fetchProducts } = useStore();
    const [activeTab, setActiveTab] = useState<TabType>('tables');
    const [isLoading, setIsLoading] = useState(true);
    const [alerts, setAlerts] = useState<Array<{ id: string; text: string; time: Date; type: string }>>([]);

    const [selectedTable, setSelectedTable] = useState<TableData | null>(null);
    const [tableOrders, setTableOrders] = useState<OrderData[]>([]);
    const [showOrderForTable, setShowOrderForTable] = useState(false);
    const [staffOrderItems, setStaffOrderItems] = useState<Array<{ productId: string; name: string; price: number; quantity: number; note: string; }>>([]);
    const [notification, setNotification] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null);

    const [currentUser, setCurrentUser] = useState<UserData | null>(null);
    const [profileAnchor, setProfileAnchor] = useState<null | HTMLElement>(null);
    const [showProfile, setShowProfile] = useState(false);
    const [profileForm, setProfileForm] = useState({ name: '', password: '' });

    // Payment Dialog State
    const [showPaymentConfirmDialog, setShowPaymentConfirmDialog] = useState(false);
    const [receiptImage, setReceiptImage] = useState<string | undefined>(undefined);
    const [paymentMethod, setPaymentMethod] = useState<'BANK' | 'CASH'>('BANK');
    const [isConfirmingPayment, setIsConfirmingPayment] = useState(false);

    const router = useRouter();

    const notify = useCallback((msg: string, type: 'success' | 'error' | 'info' = 'success') => setNotification({ msg, type }), []);
    const addAlert = useCallback((text: string, type: string) => { setAlerts(p => [{ id: Date.now().toString(), text, time: new Date(), type }, ...p].slice(0, 50)); notify(text, 'info'); }, [notify]);

    const fetchTableOrders = async (sessionId: string) => { const res = await fetch(`/api/orders?sessionId=${sessionId}`); const data = await res.json(); if (data.success) setTableOrders(data.data); };

    const { sendMessage, isConnected } = useWebSocket({
        role: 'staff',
        onMessage: useCallback((msg: WSMessage) => {
            const payload = msg.payload as Record<string, unknown>;
            if (msg.type === WSEventType.NEW_ORDER) { addAlert(`Order mới ${payload.tableName ? `từ ${payload.tableName}` : ''}`, 'order'); fetchPendingOrders(); fetchTables(); }
            if (msg.type === WSEventType.CALL_STAFF) { addAlert(`${payload.tableName || 'Bàn'} cần hỗ trợ`, 'help'); fetchTables(); }
            if (msg.type === WSEventType.PAYMENT_REQUESTED) { addAlert(`${payload.tableName || 'Bàn'} yêu cầu thanh toán - ${fmt(payload.amount as number)}`, 'payment'); fetchTables(); }
            if (msg.type === WSEventType.TABLE_STATUS_UPDATE || msg.type === WSEventType.SESSION_STATUS_UPDATE) fetchTables();
            if (msg.type === WSEventType.PAYMENT_SUCCESS) { notify('Thanh toán thành công'); fetchTables(); }
        }, [addAlert, fetchPendingOrders, fetchTables, notify])
    });

    useEffect(() => {
        (async () => {
            setIsLoading(true);
            await Promise.all([
                fetchTables(), fetchPendingOrders(), fetchProducts(),
                fetch('/api/auth/me').then(r => r.json()).then(d => { if (d.success) setCurrentUser(d.data); })
            ]);
            setIsLoading(false);
        })();
        const interval = setInterval(() => { fetchTables(); fetchPendingOrders(); }, 15000); return () => clearInterval(interval);
    }, [fetchTables, fetchPendingOrders, fetchProducts]);

    const confirmOrder = async (orderId: string) => {
        await fetch(`/api/orders/${orderId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'CONFIRMED' }) });
        sendMessage({ type: WSEventType.ORDER_CONFIRMED, payload: { orderId } });
        fetchPendingOrders(); notify('Đã xác nhận order');
    };

    const confirmPayment = async () => {
        if (!selectedTable?.currentSessionId) return;
        const sessionId = selectedTable.currentSessionId._id;
        setIsConfirmingPayment(true);

        try {
            // 1. Lấy hoặc tạo bản ghi thanh toán
            const payRes = await fetch(`/api/payments?sessionId=${sessionId}`);
            const payData = await payRes.json();
            let payment = payData.data?.[0];

            if (!payment) {
                // Nếu chưa có (khách chưa bấm thanh toán trên app), tạo mới luôn
                const createRes = await fetch('/api/payments', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ sessionId, method: paymentMethod })
                });
                const createData = await createRes.json();
                payment = createData.data;
            }

            if (payment) {
                // 2. Cập nhật trạng thái SUCCESS và người xác nhận
                await fetch(`/api/payments/${payment._id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        status: 'SUCCESS',
                        receiptImage,
                        paymentMethod,
                        confirmedBy: currentUser?._id
                    })
                });
            }

            // 3. Cập nhật Session và Table
            await fetch(`/api/sessions/${sessionId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ paymentMethod, status: 'PAID' })
            });

            sendMessage({ type: WSEventType.PAYMENT_SUCCESS, payload: { tableId: selectedTable._id }, tableId: selectedTable._id });
            fetchTables();
            notify('Xác nhận thanh toán thành công');
            setShowPaymentConfirmDialog(false);
            setSelectedTable(prev => prev ? { ...prev, status: 'CLEANING' } : null);
            setReceiptImage(undefined);
        } catch (err) {
            console.error(err);
            notify('Lỗi xử lý thanh toán', 'error');
        } finally {
            setIsConfirmingPayment(false);
        }
    };

    const handleOpenPaymentConfirm = (table: TableData) => {
        setSelectedTable(table);
        setReceiptImage(undefined);
        setPaymentMethod('BANK');
        setShowPaymentConfirmDialog(true);
    };

    const closeSession = async (table: TableData) => {
        if (!table.currentSessionId) return;
        await fetch(`/api/sessions/${table.currentSessionId._id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'CLOSED' }) });
        sendMessage({ type: WSEventType.SESSION_STATUS_UPDATE, payload: { status: 'CLOSED', tableId: table._id }, tableId: table._id });
        fetchTables(); notify('Đã đóng bàn'); setSelectedTable(null);
    };

    const submitStaffOrder = async (confirmInstantly = false) => {
        if (!selectedTable || staffOrderItems.length === 0) return;

        // If no session, create one first
        let sessionId = selectedTable.currentSessionId?._id;
        if (!sessionId) {
            const res = await fetch('/api/sessions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tableId: selectedTable._id }) });
            const data = await res.json();
            if (data.success) {
                sessionId = data.data.sessionId;
                sendMessage({ type: WSEventType.SESSION_STATUS_UPDATE, payload: { status: 'ACTIVE', tableId: selectedTable._id }, tableId: selectedTable._id });
            } else {
                notify('Không thể mở bàn', 'error'); return;
            }
        }

        const res = await fetch('/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId, items: staffOrderItems, createdBy: 'staff', confirm: confirmInstantly }) });
        const data = await res.json();
        if (data.success && sessionId) {
            sendMessage({
                type: WSEventType.NEW_ORDER,
                payload: { order: data.data, tableId: selectedTable._id, tableName: selectedTable.name, confirm: confirmInstantly },
                tableId: selectedTable._id
            });
            setStaffOrderItems([]);
            setShowOrderForTable(false);
            fetchTableOrders(sessionId);
            fetchTables();
            fetchPendingOrders();
            notify('Gửi order thành công');
        } else {
            notify(data.error || 'Lỗi gửi order', 'error');
        }
    };

    const handleLogout = async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        router.push('/login');
    };

    const saveProfile = async () => {
        if (!currentUser) return;
        const body: Record<string, string> = { name: profileForm.name };
        if (profileForm.password) body.password = profileForm.password;
        const res = await fetch(`/api/users/${currentUser._id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        if ((await res.json()).success) { notify('Đã cập nhật profile'); setShowProfile(false); }
    };

    const needsHelpCount = tables.filter(t => t.status === 'NEEDS_HELP').length;
    const paymentCount = tables.filter(t => t.status === 'PAYMENT_REQUESTED').length;
    const urgentCount = needsHelpCount + paymentCount + pendingOrders.length;
    const zones = [...new Set(tables.map(t => t.zone || 'Khác'))];

    if (isLoading) return <ThemeProvider theme={theme}><CssBaseline /><Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CircularProgress /></Box></ThemeProvider>;

    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
                {/* Header */}
                <Box sx={{ position: 'sticky', top: 0, zIndex: 40, bgcolor: 'rgba(5, 5, 5, 0.9)', backdropFilter: 'blur(10px)', borderBottom: 1, borderColor: 'divider', px: 2, pt: 1, pb: 0 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: 1024, mx: 'auto', mb: 1.5 }}>
                        <Typography variant="subtitle1" fontWeight={700}>Staff Dashboard</Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: isConnected ? '#22c55e' : '#ef4444' }} />
                            <IconButton onClick={() => { fetchTables(); fetchPendingOrders(); }} size="small" sx={{ color: 'text.secondary' }}><Refresh fontSize="small" /></IconButton>
                            {currentUser && (
                                <>
                                    <Avatar onClick={e => setProfileAnchor(e.currentTarget)} src={currentUser.avatar} sx={{ width: 32, height: 32, cursor: 'pointer', ml: 1, border: '2px solid', borderColor: 'divider' }} />
                                    <Menu anchorEl={profileAnchor} open={Boolean(profileAnchor)} onClose={() => setProfileAnchor(null)} transformOrigin={{ horizontal: 'right', vertical: 'top' }} anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }} PaperProps={{ sx: { mt: 1, bgcolor: '#111114', width: 220, border: '1px solid rgba(255,255,255,0.1)' } }}>
                                        <Box sx={{ px: 2, py: 1.5, pb: 2 }}>
                                            <Typography variant="body2" fontWeight={600} color="white">{currentUser.name}</Typography>
                                            <Typography variant="caption" color="text.secondary">{currentUser.email}</Typography>
                                        </Box>
                                        <Divider sx={{ borderColor: 'rgba(255,255,255,0.05)' }} />
                                        <MenuItem onClick={() => { setProfileAnchor(null); setProfileForm({ name: currentUser.name, password: '' }); setShowProfile(true); }} sx={{ py: 1.5, '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' } }}>
                                            <ListItemIcon><Person fontSize="small" sx={{ color: 'text.secondary' }} /></ListItemIcon>
                                            <Typography variant="body2" color="text.secondary">Tài khoản</Typography>
                                        </MenuItem>
                                        <MenuItem onClick={handleLogout} sx={{ py: 1.5, '&:hover': { bgcolor: 'rgba(239, 68, 68, 0.1)' } }}>
                                            <ListItemIcon><Logout fontSize="small" color="error" /></ListItemIcon>
                                            <Typography variant="body2" color="error">Đăng xuất</Typography>
                                        </MenuItem>
                                    </Menu>
                                </>
                            )}
                        </Box>
                    </Box>
                    <Box sx={{ maxWidth: 1024, mx: 'auto' }}>
                        <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} textColor="primary" indicatorColor="primary">
                            <Tab value="tables" label={`Bàn (${tables.length})`} />
                            <Tab value="orders" label={`Order chờ (${pendingOrders.length})`} sx={{ color: pendingOrders.length > 0 ? 'primary.main' : 'inherit' }} />
                            <Tab value="alerts" label={`Cảnh báo (${urgentCount})`} sx={{ color: urgentCount > 0 ? 'error.main' : 'inherit' }} />
                        </Tabs>
                    </Box>
                </Box>

                <Box sx={{ maxWidth: 1024, mx: 'auto', p: 3, w: '100%', flex: 1 }}>
                    {activeTab === 'tables' && (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {zones.map(zone => (
                                <Box key={zone}>
                                    <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1 }}>{zone}</Typography>
                                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', md: 'repeat(4, 1fr)', lg: 'repeat(5, 1fr)' }, gap: 2, mt: 1 }}>
                                        {tables.filter(t => (t.zone || 'Khác') === zone).map(table => {
                                            const status = STATUS_MAP[table.status] || STATUS_MAP['AVAILABLE'];
                                            return (
                                                <Box key={table._id}>
                                                    <Paper elevation={0} onClick={() => { setSelectedTable(table); if (table.currentSessionId) fetchTableOrders(table.currentSessionId._id); else setTableOrders([]); }} sx={{ p: 2, bgcolor: status.color, border: 1, borderColor: table.status === 'NEEDS_HELP' ? 'rgba(239, 68, 68, 0.5)' : 'divider', cursor: 'pointer', '&:hover': { opacity: 0.9 }, transition: 'all 0.2s', height: '100%' }}>
                                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                                            <Typography variant="subtitle2" fontWeight={700}>{table.name}</Typography>
                                                            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: status.dot, mt: 0.5 }} />
                                                        </Box>
                                                        <Typography variant="caption" color="text.secondary" display="block">{status.label}</Typography>
                                                        {table.currentSessionId && <Typography variant="subtitle2" sx={{ mt: 1.5, color: 'text.primary' }}>{fmt(table.currentSessionId.totalAmount)}</Typography>}
                                                    </Paper>
                                                </Box>
                                            )
                                        })}
                                    </Box>
                                </Box>
                            ))}
                        </Box>
                    )}

                    {activeTab === 'orders' && (
                        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 2 }}>
                            {pendingOrders.length === 0 ? <Box sx={{ p: 10, width: '100%', textAlign: 'center' }}><Typography color="text.secondary">Chưa có order chờ nào</Typography></Box> : pendingOrders.map(order => (
                                <Box key={order._id}>
                                    <Paper elevation={0} sx={{ p: 3, border: 1, borderColor: 'divider' }}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', borderBottom: 1, borderColor: 'divider', pb: 2, mb: 2 }}>
                                            <Box>
                                                <Typography variant="subtitle2">Order {order.createdBy === 'customer' ? 'từ Khách' : 'từ Nhân viên'}</Typography>
                                                <Typography variant="caption" color="text.secondary">{new Date(order.createdAt).toLocaleTimeString('vi-VN')}</Typography>
                                            </Box>
                                            <Button variant="contained" size="small" onClick={() => confirmOrder(order._id)}>Xác nhận làm</Button>
                                        </Box>
                                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                            {order.items.map(item => (
                                                <Typography key={item._id} variant="body2"><Typography component="span" color="text.secondary" sx={{ mr: 1, fontWeight: 700 }}>{item.quantity}x</Typography> {item.name}</Typography>
                                            ))}
                                        </Box>
                                    </Paper>
                                </Box>
                            ))}
                        </Box>
                    )}

                    {activeTab === 'alerts' && (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {alerts.length === 0 ? <Box sx={{ p: 10, width: '100%', textAlign: 'center' }}><Typography color="text.secondary">Không có cảnh báo</Typography></Box> : alerts.map(alert => (
                                <Box key={alert.id}>
                                    <Paper elevation={0} sx={{ p: 2, border: 1, borderColor: alert.type === 'help' ? 'rgba(239, 68, 68, 0.5)' : 'divider', bgcolor: alert.type === 'help' ? 'rgba(239, 68, 68, 0.1)' : 'background.paper' }}>
                                        <Typography variant="body2" fontWeight={600} color={alert.type === 'help' ? 'error.main' : 'text.primary'}>{alert.text}</Typography>
                                        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>{alert.time.toLocaleTimeString('vi-VN')}</Typography>
                                    </Paper>
                                </Box>
                            ))}
                        </Box>
                    )}
                </Box>
            </Box>

            {/* Table Details Modal */}
            <Dialog open={!!selectedTable} onClose={() => { setSelectedTable(null); setShowOrderForTable(false); }} maxWidth="xs" fullWidth PaperProps={{ sx: { bgcolor: 'background.paper', borderRadius: 4, backgroundImage: 'none', height: '80vh', m: 2 } }}>
                {selectedTable && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                        <Box sx={{ px: 3, py: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Box>
                                <Typography variant="h6" fontWeight={800}>{selectedTable.name}</Typography>
                                <Typography variant="caption" color="text.secondary">{STATUS_MAP[selectedTable.status]?.label}</Typography>
                            </Box>
                            <IconButton onClick={() => { setSelectedTable(null); setShowOrderForTable(false); }} size="small"><Close /></IconButton>
                        </Box>

                        <Box sx={{ flex: 1, overflowY: 'auto', p: 3 }}>
                            {selectedTable.currentSessionId && (
                                <Paper elevation={0} sx={{ p: 2, border: 1, borderColor: 'divider', bgcolor: '#18181b', mb: 3 }}>
                                    <Typography variant="caption" color="text.secondary" sx={{ letterSpacing: 1 }}>TỔNG TIỀN</Typography>
                                    <Typography variant="h5" fontWeight={800} color="primary.main">{fmt(selectedTable.currentSessionId.totalAmount)}</Typography>
                                </Paper>
                            )}

                            {/* Actions Group */}
                            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1.5, mb: 4 }}>
                                {selectedTable.status === 'NEEDS_HELP' && <Box sx={{ gridColumn: 'span 2' }}><Button fullWidth variant="contained" color="error" onClick={() => fetch(`/api/tables/${selectedTable._id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: selectedTable.currentSessionId ? 'OCCUPIED' : 'AVAILABLE' }) }).then(() => { fetchTables(); notify('Đã xử lý hỗ trợ xong'); setSelectedTable(null); })}>Xác nhận: Hỗ trợ xong</Button></Box>}
                                {selectedTable.status !== 'CLEANING' && <Box sx={{ gridColumn: 'span 2' }}><Button fullWidth variant="outlined" startIcon={<Restaurant />} onClick={() => setShowOrderForTable(true)}>{selectedTable.status === 'AVAILABLE' ? 'Mở bàn & Order món' : 'Order giúp khách'}</Button></Box>}
                                {(selectedTable.status === 'PAYMENT_REQUESTED' || selectedTable.status === 'OCCUPIED' || selectedTable.status === 'WAITING_PAYMENT') && selectedTable.currentSessionId && <Box><Button fullWidth variant="contained" sx={{ bgcolor: '#a855f7', '&:hover': { bgcolor: '#9333ea' } }} onClick={() => handleOpenPaymentConfirm(selectedTable)}>Đã thu tiền</Button></Box>}
                                {(selectedTable.status === 'CLEANING' || selectedTable.status === 'PAYMENT_REQUESTED') && selectedTable.currentSessionId && <Box><Button fullWidth variant="outlined" color="inherit" onClick={() => closeSession(selectedTable)}>Đóng bàn</Button></Box>}
                            </Box>

                            {/* Orders List */}
                            {tableOrders.length > 0 && !showOrderForTable && (
                                <Box>
                                    <Typography variant="caption" color="text.secondary" sx={{ letterSpacing: 1, display: 'block', mb: 2 }}>LỊCH SỬ ORDER</Typography>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                                        {tableOrders.map(o => (
                                            <Box key={o._id}>
                                                <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>{new Date(o.createdAt).toLocaleTimeString('vi-VN')} · {o.createdBy}</Typography>
                                                {o.items.map(item => (
                                                    <Box key={item._id} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5, borderBottom: '1px dashed #27272a' }}>
                                                        <Typography variant="body2">{item.name} <Typography component="span" color="text.secondary" fontSize="small">x{item.quantity}</Typography></Typography>
                                                        <Typography variant="caption" color={item.status === 'SERVED' ? 'success.main' : item.status === 'PREPARING' ? 'warning.main' : 'text.secondary'}>{item.status}</Typography>
                                                    </Box>
                                                ))}
                                            </Box>
                                        ))}
                                    </Box>
                                </Box>
                            )}

                            {/* Order Selection */}
                            {showOrderForTable && (
                                <Box>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                        <Typography variant="caption" color="text.secondary" sx={{ letterSpacing: 1 }}>CHỌN MÓN TỪ MENU</Typography>
                                        <Typography variant="caption" color="error" sx={{ cursor: 'pointer' }} onClick={() => setShowOrderForTable(false)}>Hủy</Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                        {products.filter(p => p.isAvailable).map(product => {
                                            const inOrder = staffOrderItems.find(i => i.productId === product._id);
                                            return (
                                                <Box key={product._id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1.5, borderRadius: 2, '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' } }}>
                                                    <Box>
                                                        <Typography variant="body2" fontWeight={600}>{product.name}</Typography>
                                                        <Typography variant="caption" color="text.secondary">{fmt(product.price)}</Typography>
                                                    </Box>
                                                    {inOrder ? (
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 1.5, px: 0.5, py: 0.25 }}>
                                                            <Typography component="span" sx={{ p: 0.5, cursor: 'pointer', color: 'text.secondary', '&:hover': { color: 'text.primary' } }} onClick={() => setStaffOrderItems(p => p.map(i => i.productId === product._id ? { ...i, quantity: i.quantity - 1 } : i).filter(i => i.quantity > 0))}>-</Typography>
                                                            <Typography variant="body2" fontWeight={600} sx={{ width: 16, textAlign: 'center' }}>{inOrder.quantity}</Typography>
                                                            <Typography component="span" sx={{ p: 0.5, cursor: 'pointer', color: 'text.primary' }} onClick={() => setStaffOrderItems(p => p.map(i => i.productId === product._id ? { ...i, quantity: i.quantity + 1 } : i))}>+</Typography>
                                                        </Box>
                                                    ) : (
                                                        <Button size="small" variant="text" onClick={() => setStaffOrderItems(p => [...p, { productId: product._id, name: product.name, price: product.price, quantity: 1, note: '' }])}>Thêm</Button>
                                                    )}
                                                </Box>
                                            )
                                        })}
                                    </Box>
                                    {staffOrderItems.length > 0 && (
                                        <Box sx={{ mt: 3, display: 'flex', flexDirection: 'column', gap: 1 }}>
                                            <Button fullWidth variant="contained" color="secondary" sx={{ py: 1.5 }} onClick={() => submitStaffOrder(true)}>
                                                Gửi & Xác nhận ngay ({staffOrderItems.reduce((s, i) => s + i.quantity, 0)})
                                            </Button>
                                            <Button fullWidth variant="outlined" sx={{ py: 1.5, borderColor: 'rgba(255,255,255,0.2)' }} onClick={() => submitStaffOrder(false)}>
                                                Chỉ gửi Order
                                            </Button>
                                        </Box>
                                    )}
                                </Box>
                            )}
                        </Box>
                    </Box>
                )}
            </Dialog>

            <Dialog open={showProfile} onClose={() => setShowProfile(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { bgcolor: 'background.paper', borderRadius: 4, backgroundImage: 'none' } }}>
                <Box sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                        <Typography variant="h6">Tài khoản</Typography>
                        <IconButton onClick={() => setShowProfile(false)} size="small" sx={{ p: 0.5 }}><Close fontSize="small" /></IconButton>
                    </Box>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <TextField label="Họ tên" fullWidth value={profileForm.name} onChange={e => setProfileForm({ ...profileForm, name: e.target.value })} />
                        <TextField label="Mật khẩu mới (Nên thì nhập)" type="password" fullWidth value={profileForm.password} onChange={e => setProfileForm({ ...profileForm, password: e.target.value })} />
                        <Button variant="contained" fullWidth onClick={saveProfile} sx={{ mt: 1, py: 1.5 }}>Lưu cập nhật</Button>
                    </Box>
                </Box>
            </Dialog>

            {/* Payment Confirm Dialog */}
            <Dialog open={showPaymentConfirmDialog} onClose={() => setShowPaymentConfirmDialog(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { bgcolor: 'background.paper', borderRadius: 4, backgroundImage: 'none' } }}>
                <Box sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                        <Typography variant="h6">Xác nhận thanh toán</Typography>
                        <IconButton onClick={() => setShowPaymentConfirmDialog(false)} size="small" sx={{ p: 0.5 }}><Close fontSize="small" /></IconButton>
                    </Box>
                    <Box sx={{ mb: 3 }}>
                        <Typography variant="body2" sx={{ mb: 1 }}>Hình thức thanh toán</Typography>
                        <Select fullWidth size="small" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value as 'BANK' | 'CASH')}>
                            <MenuItem value="BANK">Chuyển khoản</MenuItem>
                            <MenuItem value="CASH">Tiền mặt (Trực tiếp)</MenuItem>
                        </Select>
                    </Box>

                    {paymentMethod === 'BANK' && (
                        <>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                Vui lòng tải lên ảnh chụp hoá đơn hoặc ảnh chụp màn hình chuyển khoản (Bắt buộc) để xác nhận thanh toán.
                            </Typography>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center', mb: 3 }}>
                                <ImageUpload
                                    folder="receipts"
                                    value={receiptImage}
                                    onChange={(url) => setReceiptImage(url)}
                                    shape="square"
                                    size={160}
                                />
                                <Typography variant="caption" color="text.secondary">Chọn ảnh hoá đơn (bắt buộc)</Typography>
                            </Box>
                        </>
                    )}

                    <Button variant="contained" fullWidth disabled={isConfirmingPayment || (paymentMethod === 'BANK' && !receiptImage)} onClick={confirmPayment} sx={{ py: 1.5, bgcolor: '#22c55e', '&:hover': { bgcolor: '#16a34a' }, '&.Mui-disabled': { bgcolor: 'rgba(255,255,255,0.05)' } }}>
                        {isConfirmingPayment ? <CircularProgress size={24} color="inherit" /> : 'Chắc chắn, đã thu tiền'}
                    </Button>
                </Box>
            </Dialog>

            <Snackbar open={!!notification} autoHideDuration={3000} onClose={() => setNotification(null)} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
                <Alert severity={notification?.type || 'success'} sx={{ borderRadius: 3 }}>{notification?.msg}</Alert>
            </Snackbar>
        </ThemeProvider >
    );
}
