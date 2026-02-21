'use client';

import Link from 'next/link';
import { UtensilsCrossed, ArrowUpRight, Shield, ChefHat, Sparkles } from 'lucide-react';
import { Box, Typography, Paper, Container } from '@mui/material';
import { ThemeRegistry } from '@/components/admin';

export default function Home() {
  return (
    <ThemeRegistry>
      <Box sx={{
        position: 'relative',
        minHeight: '100vh',
        bgcolor: '#0c0c0f',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        p: 3,
        overflow: 'hidden',
        '& ::selection': { bgcolor: 'rgba(249, 115, 22, 0.2)' }
      }}>
        {/* Ambient glow */}
        <Box sx={{
          position: 'absolute', top: '33%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '500px', height: '500px',
          borderRadius: '50%',
          background: 'rgba(249, 115, 22, 0.04)',
          filter: 'blur(120px)',
          pointerEvents: 'none',
        }} />
        <Box sx={{
          position: 'absolute', bottom: 0, left: '50%',
          transform: 'translateX(-50%)',
          width: '800px', height: '300px',
          background: 'linear-gradient(to top, rgba(249, 115, 22, 0.02), transparent)',
          pointerEvents: 'none'
        }} />

        {/* Content */}
        <Container maxWidth="xs" sx={{ position: 'relative', zIndex: 10 }}>
          {/* Hero */}
          <Box className="animate-fade-in" sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', mb: 7 }}>
            <Box sx={{ w: 56, h: 56, borderRadius: 4, bgcolor: '#f97316', display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 4, boxShadow: '0 20px 40px rgba(249, 115, 22, 0.2)', p: 2 }}>
              <UtensilsCrossed style={{ width: 28, height: 28, color: '#fff' }} />
            </Box>

            <Box sx={{
              display: 'inline-flex', alignItems: 'center', gap: 1, px: 2, py: 0.75,
              borderRadius: 10, bgcolor: 'rgba(249, 115, 22, 0.1)', border: '1px solid rgba(249, 115, 22, 0.2)',
              color: '#f97316', fontSize: 11, fontWeight: 600, mb: 3, textTransform: 'uppercase', letterSpacing: 1
            }}>
              <Sparkles style={{ width: 12, height: 12 }} />
              Restaurant Management
            </Box>

            <Typography variant="h2" sx={{ fontSize: { xs: 42, md: 52 }, fontWeight: 800, color: '#fff', letterSpacing: -1, lineHeight: 1.05, mb: 2 }}>
              Rest<Typography component="span" sx={{ color: '#f97316', fontSize: 'inherit', fontWeight: 'inherit' }}>Order</Typography>
            </Typography>
            <Typography variant="body1" sx={{ color: '#a1a1aa', maxWidth: 340, lineHeight: 1.6 }}>
              Hệ thống quản lý đặt món thông minh cho nhà hàng hiện đại.
            </Typography>
          </Box>

          {/* Navigation Cards */}
          <Box className="animate-fade-in" sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, animationDelay: '0.15s', animationFillMode: 'both' }}>
            {/* Customer Order */}
            <Link href="/order/demo" passHref style={{ textDecoration: 'none' }}>
              <Paper elevation={0} sx={{
                p: 2.5, borderRadius: 4, bgcolor: '#111114', border: '1px solid rgba(255, 255, 255, 0.05)',
                display: 'flex', alignItems: 'center', gap: 2.5, transition: 'all 0.3s',
                '&:hover': { borderColor: 'rgba(249, 115, 22, 0.3)', bgcolor: 'rgba(249, 115, 22, 0.03)', '& .icon-box': { bgcolor: 'rgba(249, 115, 22, 0.2)' }, '& .arrow': { color: '#f97316' } }
              }}>
                <Box className="icon-box" sx={{ width: 48, height: 48, borderRadius: 2.5, bgcolor: 'rgba(249, 115, 22, 0.1)', border: '1px solid rgba(249, 115, 22, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.3s' }}>
                  <UtensilsCrossed style={{ width: 20, height: 20, color: '#f97316' }} />
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#fff', mb: 0.5 }}>Đặt món</Typography>
                  <Typography variant="body2" sx={{ color: '#71717a', lineHeight: 1.4, fontSize: 13 }}>Quét mã QR tại bàn để xem menu và gọi món</Typography>
                </Box>
                <ArrowUpRight className="arrow" style={{ width: 16, height: 16, color: '#52525b', flexShrink: 0, transition: 'color 0.3s' }} />
              </Paper>
            </Link>

            {/* Staff */}
            <Link href="/login" passHref style={{ textDecoration: 'none' }}>
              <Paper elevation={0} sx={{
                p: 2.5, borderRadius: 4, bgcolor: '#111114', border: '1px solid rgba(255, 255, 255, 0.05)',
                display: 'flex', alignItems: 'center', gap: 2.5, transition: 'all 0.3s',
                '&:hover': { borderColor: 'rgba(249, 115, 22, 0.3)', bgcolor: 'rgba(249, 115, 22, 0.03)', '& .icon-box': { bgcolor: 'rgba(249, 115, 22, 0.2)' }, '& .arrow': { color: '#f97316' } }
              }}>
                <Box className="icon-box" sx={{ width: 48, height: 48, borderRadius: 2.5, bgcolor: 'rgba(249, 115, 22, 0.1)', border: '1px solid rgba(249, 115, 22, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.3s' }}>
                  <ChefHat style={{ width: 20, height: 20, color: '#f97316' }} />
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#fff', mb: 0.5 }}>Nhân viên</Typography>
                  <Typography variant="body2" sx={{ color: '#71717a', lineHeight: 1.4, fontSize: 13 }}>Quản lý bàn, xác nhận order và thanh toán</Typography>
                </Box>
                <ArrowUpRight className="arrow" style={{ width: 16, height: 16, color: '#52525b', flexShrink: 0, transition: 'color 0.3s' }} />
              </Paper>
            </Link>

            {/* Admin */}
            <Link href="/login" passHref style={{ textDecoration: 'none' }}>
              <Paper elevation={0} sx={{
                p: 2.5, borderRadius: 4, bgcolor: '#111114', border: '1px solid rgba(255, 255, 255, 0.05)',
                display: 'flex', alignItems: 'center', gap: 2.5, transition: 'all 0.3s',
                '&:hover': { borderColor: 'rgba(249, 115, 22, 0.3)', bgcolor: 'rgba(249, 115, 22, 0.03)', '& .icon-box': { bgcolor: 'rgba(249, 115, 22, 0.2)' }, '& .arrow': { color: '#f97316' } }
              }}>
                <Box className="icon-box" sx={{ width: 48, height: 48, borderRadius: 2.5, bgcolor: 'rgba(249, 115, 22, 0.1)', border: '1px solid rgba(249, 115, 22, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.3s' }}>
                  <Shield style={{ width: 20, height: 20, color: '#f97316' }} />
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#fff', mb: 0.5 }}>Quản lý</Typography>
                  <Typography variant="body2" sx={{ color: '#71717a', lineHeight: 1.4, fontSize: 13 }}>Dashboard thống kê, menu, bàn và nhân viên</Typography>
                </Box>
                <ArrowUpRight className="arrow" style={{ width: 16, height: 16, color: '#52525b', flexShrink: 0, transition: 'color 0.3s' }} />
              </Paper>
            </Link>
          </Box>

          {/* Footer */}
          <Typography sx={{ textAlign: 'center', mt: 6, fontSize: 11, color: '#52525b', letterSpacing: 1, textTransform: 'uppercase' }}>
            RestOrder v1.0 &middot; Restaurant Management System
          </Typography>
        </Container>
      </Box>
    </ThemeRegistry>
  );
}
