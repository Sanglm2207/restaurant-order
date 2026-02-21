'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useWebSocket } from '@/hooks/useWebSocket';
import { WSEventType, type WSMessage } from '@/types';
import {
    Box, Typography, IconButton, Button, CircularProgress,
    Badge, Dialog, Drawer, Snackbar, Alert, Paper
} from '@mui/material';
import {
    Restaurant, ShoppingCart, Add, Remove,
    NotificationsActive, CreditCard, Close, CheckCircle,
    ChatBubbleOutline, QrCodeScanner, PaidOutlined
} from '@mui/icons-material';
import { ThemeRegistry } from '@/components/admin'; // Reuse the MUI Theme
import { useStore, ProductData } from '@/store';

interface CartItem { productId: string; name: string; price: number; quantity: number; note: string; }

interface OrderData {
    _id: string;
    items: Array<{ _id: string; name: string; price: number; quantity: number; note?: string; status: string; }>;
    createdAt: string;
}

const fmt = (n: number) => new Intl.NumberFormat('vi-VN').format(n) + 'đ';

export default function OrderPage() {
    const params = useParams();
    const tableId = params.tableId as string;

    const [sessionId, setSessionId] = useState<string | null>(null);
    const [sessionStatus, setSessionStatus] = useState('');
    const [tableName, setTableName] = useState('');
    const [totalAmount, setTotalAmount] = useState(0);


    const { categories, products, fetchCategories, fetchProducts } = useStore();
    const [activeCategory, setActiveCategory] = useState<string | null>(null);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [orders, setOrders] = useState<OrderData[]>([]);

    const [showCart, setShowCart] = useState(false);
    const [showPayment, setShowPayment] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const [notification, setNotification] = useState<{ msg: string, type: 'success' | 'info' | 'error' } | null>(null);

    const [noteFor, setNoteFor] = useState<string | null>(null);
    const [noteText, setNoteText] = useState('');

    const { sendMessage, isConnected } = useWebSocket({
        role: 'customer', tableId, sessionId: sessionId ?? undefined,
        onMessage: useCallback((msg: WSMessage) => {
            if (msg.type === WSEventType.ORDER_CONFIRMED) { showNotif('✅ Order đã được xác nhận!', 'success'); fetchOrders(); }
            if (msg.type === WSEventType.ORDER_STATUS_UPDATE) fetchOrders();
            if (msg.type === WSEventType.PAYMENT_SUCCESS) { setSessionStatus('PAID'); showNotif('✅ Thanh toán thành công!', 'success'); }
            if (msg.type === WSEventType.MENU_ITEM_UPDATE) fetchProducts();
        }, []),
    });

    const showNotif = (msg: string, type: 'success' | 'info' | 'error' = 'info') => setNotification({ msg, type });

    const loadProducts = async () => {
        await fetchCategories();
        await fetchProducts();
    };

    const fetchOrders = async () => {
        if (!sessionId) return;
        const res = await fetch(`/api/orders?sessionId=${sessionId}`);
        const data = await res.json();
        if (data.success) setOrders(data.data);
    };

    useEffect(() => {
        async function init() {
            setIsLoading(true);
            try {
                const res = await fetch('/api/sessions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tableId }) });
                const data = await res.json();
                if (data.success) {
                    setSessionId(data.data.sessionId);
                    setSessionStatus(data.data.status);
                    setTotalAmount(data.data.totalAmount);
                    setTableName(data.data.tableName);
                    if (data.data.orders) setOrders(data.data.orders);
                }
                await loadProducts();
            } catch (err) { console.error('Init error:', err); } finally { setIsLoading(false); }
        }
        init();
    }, [tableId]);

    useEffect(() => {
        if (categories.length > 0 && !activeCategory) {
            setActiveCategory(categories[0]._id);
        }
    }, [categories]);

    const addToCart = (product: ProductData) => {
        setCart(prev => {
            const existing = prev.find(item => item.productId === product._id);
            if (existing) return prev.map(item => item.productId === product._id ? { ...item, quantity: item.quantity + 1 } : item);
            return [...prev, { productId: product._id, name: product.name, price: product.price, quantity: 1, note: '' }];
        });
    };

    const updateQuantity = (productId: string, delta: number) => {
        setCart(prev => prev.map(item => {
            if (item.productId === productId) { const newQty = item.quantity + delta; return newQty <= 0 ? null : { ...item, quantity: newQty }; }
            return item;
        }).filter(Boolean) as CartItem[]);
    };

    const updateNote = (productId: string, note: string) => {
        setCart(prev => prev.map(item => item.productId === productId ? { ...item, note } : item));
    };

    const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

    const submitOrder = async () => {
        if (!sessionId || cart.length === 0) return;
        setIsSending(true);
        try {
            const res = await fetch('/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId, items: cart, createdBy: 'customer' }) });
            const data = await res.json();
            if (data.success) {
                sendMessage({ type: WSEventType.NEW_ORDER, payload: { order: data.data, tableId, tableName }, tableId, sessionId });
                setCart([]); setShowCart(false); setTotalAmount(prev => prev + cartTotal);
                showNotif('🎉 Đã gửi order thành công!', 'success'); fetchOrders();
            }
        } catch { showNotif('❌ Lỗi gửi order!', 'error'); } finally { setIsSending(false); }
    };

    const requestPayment = async (method: 'CASH' | 'QR_ONLINE') => {
        if (!sessionId) return;
        const res = await fetch('/api/payments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId, method }) });
        const data = await res.json();
        if (data.success) {
            sendMessage({ type: WSEventType.PAYMENT_REQUESTED, payload: { method, tableName, amount: totalAmount }, tableId, sessionId });
            setSessionStatus(method === 'QR_ONLINE' ? 'WAITING_PAYMENT' : 'PAYMENT_REQUESTED');
            setShowPayment(false); showNotif(method === 'CASH' ? 'Nhân viên sẽ đến thanh toán!' : 'Đang chờ thanh toán QR...', 'info');
        }
    };

    if (isLoading) return <ThemeRegistry><Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', bgcolor: '#f9fafb' }}><CircularProgress color="primary" sx={{ mb: 2 }} /><Typography color="text.secondary">Đang tải menu...</Typography></Box></ThemeRegistry>;

    if (sessionStatus === 'PAID') return (
        <ThemeRegistry>
            <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', bgcolor: '#f0fdf4', p: 3, textAlign: 'center' }}>
                <CheckCircle sx={{ fontSize: 80, color: '#22c55e', mb: 2 }} />
                <Typography variant="h4" fontWeight={800} sx={{ mb: 1 }}>Cảm ơn quý khách!</Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>Thanh toán thành công</Typography>
                <Typography variant="h4" fontWeight={700} color="#16a34a">{fmt(totalAmount)}</Typography>
                <Typography variant="caption" sx={{ mt: 4, color: 'text.disabled' }}>Hẹn gặp lại quý khách lần sau</Typography>
            </Box>
        </ThemeRegistry>
    );

    const filteredProducts = activeCategory ? products.filter(p => (typeof p.categoryId === 'object' ? p.categoryId._id : p.categoryId) === activeCategory) : products;

    return (
        <ThemeRegistry>
            <Box sx={{ minHeight: '100vh', bgcolor: '#f9fafb', pb: 12 }}>
                {/* Header */}
                <Paper elevation={0} square sx={{ position: 'sticky', top: 0, zIndex: 40, borderBottom: '1px solid #f3f4f6', bgcolor: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(8px)' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1.5, maxWidth: 'md', mx: 'auto' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: 'primary.main', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Restaurant sx={{ color: '#fff', fontSize: 18 }} />
                            </Box>
                            <Box>
                                <Typography variant="subtitle2" fontWeight={700}>RestOrder</Typography>
                                <Typography variant="caption" color="text.secondary">{tableName}</Typography>
                            </Box>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: isConnected ? '#22c55e' : '#ef4444' }} />
                            <IconButton onClick={() => { fetch(`/api/tables/${tableId}/call-staff`, { method: 'POST' }); sendMessage({ type: WSEventType.CALL_STAFF, payload: { tableName }, tableId }); showNotif('Đã gọi nhân viên', 'success'); }} sx={{ bgcolor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', '&:hover': { bgcolor: 'rgba(239, 68, 68, 0.2)' } }}>
                                <NotificationsActive fontSize="small" />
                            </IconButton>
                        </Box>
                    </Box>
                </Paper>

                <Box sx={{ maxWidth: 'md', mx: 'auto' }}>
                    {/* Status Alert */}
                    {(sessionStatus === 'PAYMENT_REQUESTED' || sessionStatus === 'WAITING_PAYMENT') && (
                        <Box sx={{ px: 2, pt: 2 }}>
                            <Alert severity="info" sx={{ borderRadius: 3, alignItems: 'center', '& .MuiAlert-icon': { py: 0.5 } }}>
                                {sessionStatus === 'PAYMENT_REQUESTED' ? 'Đang chờ nhân viên thanh toán...' : 'Đang chờ thanh toán QR...'}
                            </Alert>
                        </Box>
                    )}

                    {/* Category Tabs */}
                    <Box sx={{ position: 'sticky', top: 61, zIndex: 30, bgcolor: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)', borderBottom: '1px solid #f3f4f6', overflowX: 'auto', '&::-webkit-scrollbar': { display: 'none' } }}>
                        <Box sx={{ display: 'flex', gap: 1, px: 2, py: 1.5, minWidth: 'max-content' }}>
                            {categories.map(cat => (
                                <Box key={cat._id} onClick={() => setActiveCategory(cat._id)} sx={{ px: 2, py: 1, borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 600, transition: 'all 0.2s', bgcolor: activeCategory === cat._id ? 'primary.main' : '#f3f4f6', color: activeCategory === cat._id ? '#fff' : 'text.secondary', boxShadow: activeCategory === cat._id ? '0 4px 12px rgba(249, 115, 22, 0.2)' : 'none' }}>
                                    {cat.name}
                                </Box>
                            ))}
                        </Box>
                    </Box>

                    {/* Product List */}
                    <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {filteredProducts.map(product => {
                            const inCart = cart.find(i => i.productId === product._id);
                            return (
                                <Paper key={product._id} elevation={0} sx={{ p: 1.5, borderRadius: 4, display: 'flex', gap: 2, border: '1px solid #f3f4f6' }}>
                                    {product.image ? (
                                        <Box component="img" src={product.image} sx={{ width: 88, height: 88, borderRadius: 3, objectFit: 'cover' }} />
                                    ) : (
                                        <Box sx={{ width: 88, height: 88, borderRadius: 3, bgcolor: 'rgba(249, 115, 22, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <Restaurant sx={{ fontSize: 32, color: 'primary.main', opacity: 0.6 }} />
                                        </Box>
                                    )}
                                    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                                        <Box>
                                            <Typography variant="subtitle2" fontWeight={700}>{product.name}</Typography>
                                            {product.description && <Typography variant="caption" color="text.secondary" sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{product.description}</Typography>}
                                            <Typography variant="subtitle2" color="primary" fontWeight={800} sx={{ mt: 0.5 }}>{fmt(product.price)}</Typography>
                                        </Box>
                                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                                            {inCart ? (
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <IconButton size="small" onClick={() => updateQuantity(product._id, -1)} sx={{ bgcolor: '#f3f4f6' }}><Remove fontSize="small" /></IconButton>
                                                    <Typography variant="subtitle2" sx={{ width: 20, textAlign: 'center' }}>{inCart.quantity}</Typography>
                                                    <IconButton size="small" onClick={() => updateQuantity(product._id, 1)} sx={{ bgcolor: 'primary.main', color: '#fff', '&:hover': { bgcolor: 'primary.dark' } }}><Add fontSize="small" /></IconButton>
                                                </Box>
                                            ) : (
                                                <IconButton size="small" onClick={() => addToCart(product)} sx={{ bgcolor: 'rgba(249, 115, 22, 0.1)', color: 'primary.main', borderRadius: 2, px: 2, '&:hover': { bgcolor: 'rgba(249, 115, 22, 0.2)' } }}>
                                                    <Add fontSize="small" />
                                                </IconButton>
                                            )}
                                        </Box>
                                    </Box>
                                </Paper>
                            );
                        })}
                    </Box>

                    {/* Order History */}
                    {orders.length > 0 && (
                        <Box sx={{ p: 2, pt: 0 }}>
                            <Typography variant="subtitle2" sx={{ textTransform: 'uppercase', color: 'text.disabled', letterSpacing: 1, mb: 1.5 }}>Đã Order</Typography>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                {orders.map(order => (
                                    <Paper key={order._id} elevation={0} sx={{ p: 2, borderRadius: 3, border: '1px solid #f3f4f6' }}>
                                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>{new Date(order.createdAt).toLocaleTimeString('vi-VN')}</Typography>
                                        {order.items.map(item => (
                                            <Box key={item._id} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                                                <Typography variant="body2">{item.name} <Typography component="span" color="text.secondary" fontSize="small">x{item.quantity}</Typography></Typography>
                                                <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                                                    <Typography variant="caption" sx={{ px: 1, py: 0.25, borderRadius: 1, bgcolor: item.status === 'SERVED' ? '#dcfce7' : item.status === 'PREPARING' ? '#fef3c7' : '#f3f4f6', color: item.status === 'SERVED' ? '#16a34a' : item.status === 'PREPARING' ? '#d97706' : 'text.secondary', fontWeight: 600 }}>
                                                        {item.status === 'SERVED' ? 'Đã lên' : item.status === 'PREPARING' ? 'Đang làm' : item.status === 'CANCELLED' ? 'Đã hủy' : 'Chờ'}
                                                    </Typography>
                                                    <Typography variant="body2" fontWeight={600} color="text.secondary">{fmt(item.price * item.quantity)}</Typography>
                                                </Box>
                                            </Box>
                                        ))}
                                    </Paper>
                                ))}
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, bgcolor: '#fff', borderRadius: 3, border: '1px solid #f3f4f6', mt: 1 }}>
                                    <Typography variant="subtitle2" color="text.secondary">Tổng tạm tính</Typography>
                                    <Typography variant="h6" color="primary" fontWeight={800}>{fmt(totalAmount)}</Typography>
                                </Box>
                            </Box>
                        </Box>
                    )}
                </Box>

                {/* Floating Bottom Navigation */}
                <Box sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50, p: 2, pointerEvents: 'none' }}>
                    <Box sx={{ maxWidth: 'md', mx: 'auto', display: 'flex', gap: 1, pointerEvents: 'auto' }}>
                        {cart.length > 0 && !showCart ? (
                            <Button fullWidth variant="contained" onClick={() => setShowCart(true)} sx={{ borderRadius: 4, py: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: 'primary.main', fontSize: 15, boxShadow: '0 8px 24px rgba(249, 115, 22, 0.4)' }}>
                                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                    <Badge badgeContent={cartCount} color="error"><ShoppingCart /></Badge>
                                    <Typography variant="button" fontWeight={700}>Giỏ hàng</Typography>
                                </Box>
                                <Typography variant="h6" fontWeight={800}>{fmt(cartTotal)}</Typography>
                            </Button>
                        ) : orders.length > 0 && cart.length === 0 && ['ACTIVE', 'WAITING_PAYMENT', 'PAYMENT_REQUESTED'].includes(sessionStatus) ? (
                            <>
                                <Button fullWidth variant="contained" onClick={() => setShowPayment(true)} sx={{ borderRadius: 4, py: 1.5, bgcolor: '#8b5cf6', '&:hover': { bgcolor: '#7c3aed' }, boxShadow: '0 8px 24px rgba(139, 92, 246, 0.4)' }}>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                        <Typography variant="button" fontWeight={700} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}><CreditCard fontSize="small" /> Thanh toán</Typography>
                                        <Typography variant="subtitle2" fontWeight={800}>{fmt(totalAmount)}</Typography>
                                    </Box>
                                </Button>
                            </>
                        ) : null}
                    </Box>
                </Box>
            </Box>

            {/* Cart Drawer */}
            <Drawer anchor="bottom" open={showCart} onClose={() => setShowCart(false)} PaperProps={{ sx: { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85vh' } }}>
                <Box sx={{ p: 3, pb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f3f4f6' }}>
                    <Typography variant="h6" fontWeight={800}>Giỏ hàng ({cartCount})</Typography>
                    <IconButton size="small" onClick={() => setShowCart(false)}><Close /></IconButton>
                </Box>
                <Box sx={{ p: 3, flex: 1, overflowY: 'auto' }}>
                    {cart.map(item => (
                        <Box key={item.productId} sx={{ display: 'flex', flexDirection: 'column', gap: 1, pb: 2, mb: 2, borderBottom: '1px solid #f3f4f6', '&:last-child': { border: 0, mb: 0, pb: 0 } }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <Box>
                                    <Typography variant="subtitle2" fontWeight={700}>{item.name}</Typography>
                                    <Typography variant="subtitle2" color="primary" fontWeight={800}>{fmt(item.price)}</Typography>
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <IconButton size="small" onClick={() => updateQuantity(item.productId, -1)} sx={{ bgcolor: '#f3f4f6' }}><Remove fontSize="small" /></IconButton>
                                    <Typography variant="subtitle2" sx={{ width: 20, textAlign: 'center' }}>{item.quantity}</Typography>
                                    <IconButton size="small" onClick={() => updateQuantity(item.productId, 1)} sx={{ bgcolor: 'primary.main', color: '#fff' }}><Add fontSize="small" /></IconButton>
                                </Box>
                            </Box>
                            {item.note ? (
                                <Typography variant="caption" color="text.secondary" onClick={() => { setNoteFor(item.productId); setNoteText(item.note); }} sx={{ cursor: 'pointer', fontStyle: 'italic', bgcolor: '#f9fafb', p: 1, borderRadius: 1 }}>📝 {item.note}</Typography>
                            ) : (
                                <Typography variant="caption" color="text.secondary" onClick={() => { setNoteFor(item.productId); setNoteText(''); }} sx={{ cursor: 'pointer', '&:hover': { color: 'primary.main' }, display: 'flex', alignItems: 'center', gap: 0.5 }}><ChatBubbleOutline sx={{ fontSize: 14 }} /> Thêm ghi chú</Typography>
                            )}
                        </Box>
                    ))}
                </Box>
                <Box sx={{ p: 3, borderTop: '1px solid #f3f4f6', bgcolor: '#fff' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                        <Typography variant="subtitle1" fontWeight={600} color="text.secondary">Tổng cộng</Typography>
                        <Typography variant="h5" color="primary" fontWeight={800}>{fmt(cartTotal)}</Typography>
                    </Box>
                    <Button fullWidth variant="contained" disabled={isSending} onClick={submitOrder} sx={{ py: 2, borderRadius: 4, fontSize: 16, fontWeight: 700, boxShadow: '0 8px 24px rgba(249, 115, 22, 0.4)' }}>
                        {isSending ? <CircularProgress size={24} color="inherit" /> : 'Gửi Order'}
                    </Button>
                </Box>
            </Drawer>

            {/* Payment Drawer */}
            <Drawer anchor="bottom" open={showPayment} onClose={() => setShowPayment(false)} PaperProps={{ sx: { borderTopLeftRadius: 24, borderTopRightRadius: 24 } }}>
                <Box sx={{ p: 3, pb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h6" fontWeight={800}>Chọn hình thức thanh toán</Typography>
                    <IconButton size="small" onClick={() => setShowPayment(false)}><Close /></IconButton>
                </Box>
                <Box sx={{ px: 3, pb: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Paper elevation={0} onClick={() => requestPayment('CASH')} sx={{ p: 2.5, borderRadius: 4, border: '2px solid #f3f4f6', cursor: 'pointer', display: 'flex', gap: 2, alignItems: 'center', transition: 'all 0.2s', '&:hover': { borderColor: '#8b5cf6', bgcolor: '#f5f3ff' } }}>
                        <Box sx={{ width: 48, height: 48, borderRadius: 3, bgcolor: '#e0e7ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><PaidOutlined sx={{ color: '#4f46e5' }} /></Box>
                        <Box>
                            <Typography variant="subtitle1" fontWeight={700}>Tại quầy / Tiền mặt</Typography>
                            <Typography variant="caption" color="text.secondary">Nhân viên sẽ đến hỗ trợ thanh toán</Typography>
                        </Box>
                    </Paper>
                    <Paper elevation={0} onClick={() => requestPayment('QR_ONLINE')} sx={{ p: 2.5, borderRadius: 4, border: '2px solid #f3f4f6', cursor: 'pointer', display: 'flex', gap: 2, alignItems: 'center', transition: 'all 0.2s', '&:hover': { borderColor: '#22c55e', bgcolor: '#f0fdf4' } }}>
                        <Box sx={{ width: 48, height: 48, borderRadius: 3, bgcolor: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><QrCodeScanner sx={{ color: '#16a34a' }} /></Box>
                        <Box>
                            <Typography variant="subtitle1" fontWeight={700}>Mã QR Chuyển khoản</Typography>
                            <Typography variant="caption" color="text.secondary">Quét mã thanh toán trực tuyến</Typography>
                        </Box>
                    </Paper>
                </Box>
            </Drawer>

            {/* Note Dialog */}
            <Dialog open={!!noteFor} onClose={() => setNoteFor(null)} PaperProps={{ sx: { borderRadius: 4, width: '100%', m: 2 } }}>
                <Box sx={{ p: 3 }}>
                    <Typography variant="h6" fontWeight={800} sx={{ mb: 2 }}>Ghi chú món ăn</Typography>
                    <Box component="input" autoFocus value={noteText} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNoteText(e.target.value)} placeholder="VD: ít đá, không hành..." sx={{ width: '100%', p: 2, borderRadius: 2, border: '1px solid #e5e7eb', fontSize: 16, outline: 'none', '&:focus': { borderColor: 'primary.main', borderSize: 2 } }} />
                    <Box sx={{ display: 'flex', gap: 1.5, mt: 3 }}>
                        <Button fullWidth variant="outlined" onClick={() => setNoteFor(null)} sx={{ borderRadius: 2 }}>Hủy</Button>
                        <Button fullWidth variant="contained" onClick={() => { if (noteFor) updateNote(noteFor, noteText); setNoteFor(null); setNoteText(''); }} sx={{ borderRadius: 2, boxShadow: 'none' }}>Lưu</Button>
                    </Box>
                </Box>
            </Dialog>

            <Snackbar open={!!notification} autoHideDuration={3000} onClose={() => setNotification(null)} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
                <Alert severity={notification?.type || 'info'} variant="filled" sx={{ borderRadius: 3, width: '100%' }}>{notification?.msg}</Alert>
            </Snackbar>
        </ThemeRegistry>
    );
}
