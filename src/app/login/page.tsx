'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFormik } from 'formik';
import {
    Box, Typography, TextField, Button, Alert,
    Paper, CircularProgress, Container
} from '@mui/material';
import { Restaurant } from '@mui/icons-material';
import { ThemeRegistry } from '@/components/admin'; // Use our global MUI theme

export default function LoginPage() {
    const router = useRouter();
    const [error, setError] = useState('');

    const formik = useFormik({
        initialValues: {
            email: 'admin@restaurant.com',
            password: 'admin123',
        },
        onSubmit: async (values, { setSubmitting }) => {
            setError('');
            try {
                const res = await fetch('/api/auth', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(values),
                });
                const data = await res.json();

                if (!data.success) {
                    setError(data.error);
                    setSubmitting(false);
                    return;
                }

                router.push(data.data.role === 'ADMIN' || data.data.role === 'MANAGER' ? '/admin' : '/staff');
            } catch {
                setError('Lỗi kết nối server');
                setSubmitting(false);
            }
        },
    });

    return (
        <ThemeRegistry>
            <Box sx={{
                minHeight: '100vh',
                bgcolor: 'background.default',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                p: 2,
                position: 'relative',
                overflow: 'hidden'
            }}>
                {/* Background Decor */}
                <Box sx={{
                    position: 'absolute',
                    top: '50%', left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '800px', height: '600px',
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(249,115,22,0.15) 0%, rgba(249,115,22,0) 70%)',
                    filter: 'blur(60px)',
                    zIndex: 0,
                    pointerEvents: 'none'
                }} />

                <Container maxWidth="xs" sx={{ position: 'relative', zIndex: 1 }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 5 }}>
                        <Box sx={{
                            w: 56, h: 56,
                            borderRadius: 4,
                            bgcolor: 'primary.main',
                            boxShadow: '0 12px 24px rgba(249, 115, 22, 0.4)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            mb: 3, p: 2
                        }}>
                            <Restaurant sx={{ color: '#fff', fontSize: 32 }} />
                        </Box>
                        <Typography variant="h4" fontWeight={800} color="text.primary" gutterBottom>Đăng nhập</Typography>
                        <Typography variant="body2" color="text.secondary">Vui lòng nhập thông tin để vào hệ thống</Typography>
                    </Box>

                    <Paper elevation={0} sx={{
                        p: 4,
                        borderRadius: 6,
                        border: '1px solid',
                        borderColor: 'divider',
                        boxShadow: '0 20px 40px rgba(0,0,0,0.05)',
                        bgcolor: 'background.paper'
                    }}>
                        {error && (
                            <Alert severity="error" sx={{ mb: 3, borderRadius: 3 }}>{error}</Alert>
                        )}

                        <form onSubmit={formik.handleSubmit}>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                                <TextField
                                    id="email"
                                    name="email"
                                    label="Email"
                                    type="email"
                                    value={formik.values.email}
                                    onChange={formik.handleChange}
                                    fullWidth
                                    required
                                    autoFocus
                                    variant="outlined"
                                />

                                <TextField
                                    id="password"
                                    name="password"
                                    label="Mật khẩu"
                                    type="password"
                                    value={formik.values.password}
                                    onChange={formik.handleChange}
                                    fullWidth
                                    required
                                    variant="outlined"
                                />

                                <Button
                                    type="submit"
                                    variant="contained"
                                    disabled={formik.isSubmitting}
                                    fullWidth
                                    sx={{
                                        mt: 1,
                                        py: 1.5,
                                        borderRadius: 3,
                                        fontSize: 16,
                                        fontWeight: 700,
                                        boxShadow: '0 8px 16px rgba(249, 115, 22, 0.3)'
                                    }}
                                >
                                    {formik.isSubmitting ? <CircularProgress size={24} color="inherit" /> : 'Đăng nhập'}
                                </Button>
                            </Box>
                        </form>
                    </Paper>

                    <Box sx={{ mt: 5, textAlign: 'center' }}>
                        <Typography variant="caption" color="text.secondary" display="block">
                            Chỉ <b>Quản lý</b> hoặc <b>Nhân viên</b> mới có quyền đăng nhập.
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block">
                            Khách hàng vui lòng quét mã QR tại bàn.
                        </Typography>
                    </Box>
                </Container>
            </Box>
        </ThemeRegistry>
    );
}
