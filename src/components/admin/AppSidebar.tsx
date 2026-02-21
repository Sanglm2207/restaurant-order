'use client';

import { ReactNode } from 'react';
import {
    Box, Drawer, List, ListItemButton, ListItemIcon, ListItemText,
    Typography, Avatar, Divider, useMediaQuery, useTheme,
} from '@mui/material';
import {
    Dashboard as DashboardIcon, Restaurant, TableBar, People,
    Receipt, Logout, Settings,
} from '@mui/icons-material';

export type AdminTab = 'dashboard' | 'menu' | 'tables' | 'staff' | 'invoices';

interface NavItem { key: AdminTab; label: string; icon: ReactNode }

const DRAWER_WIDTH = 240;

const mainNav: NavItem[] = [
    { key: 'dashboard', label: 'Dashboard', icon: <DashboardIcon sx={{ fontSize: 20 }} /> },
    { key: 'menu', label: 'Menu', icon: <Restaurant sx={{ fontSize: 20 }} /> },
    { key: 'tables', label: 'Quản lý bàn', icon: <TableBar sx={{ fontSize: 20 }} /> },
];

const mgmtNav: NavItem[] = [
    { key: 'staff', label: 'Nhân viên', icon: <People sx={{ fontSize: 20 }} /> },
    { key: 'invoices', label: 'Hoá đơn', icon: <Receipt sx={{ fontSize: 20 }} /> },
];

interface Props {
    activeTab: AdminTab;
    onTabChange: (tab: AdminTab) => void;
    open: boolean;
    onClose: () => void;
    user?: { name: string; role: string; avatar?: string } | null;
    onOpenProfile?: () => void;
}

export default function AppSidebar({ activeTab, onTabChange, open, onClose, user, onOpenProfile }: Props) {
    const theme = useTheme();
    const isMd = useMediaQuery(theme.breakpoints.up('md'));

    const handleNav = (key: AdminTab) => { onTabChange(key); if (!isMd) onClose(); };

    const content = (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Brand */}
            <Box sx={{ px: 3, pt: 3.5, pb: 2.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: 'primary.main', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Restaurant sx={{ color: '#fff', fontSize: 18 }} />
                    </Box>
                    <Typography variant="subtitle1" fontWeight={700} color="text.primary">Admin</Typography>
                </Box>
            </Box>

            {/* Navigation */}
            <Box sx={{ flex: 1, overflow: 'auto', px: 1.5, py: 2 }}>
                <List disablePadding>
                    {mainNav.map(item => (
                        <ListItemButton key={item.key} selected={activeTab === item.key} onClick={() => handleNav(item.key)}>
                            <ListItemIcon sx={{ minWidth: 36, color: activeTab === item.key ? 'text.primary' : 'text.secondary' }}>{item.icon}</ListItemIcon>
                            <ListItemText primary={item.label} primaryTypographyProps={{ variant: 'body2', fontWeight: activeTab === item.key ? 600 : 400 }} />
                        </ListItemButton>
                    ))}
                </List>

                <Typography variant="caption" sx={{ display: 'block', px: 1.5, pt: 3, pb: 0.5, fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'text.disabled' }}>
                    Quản lý
                </Typography>
                <List disablePadding>
                    {mgmtNav.map(item => (
                        <ListItemButton key={item.key} selected={activeTab === item.key} onClick={() => handleNav(item.key)}>
                            <ListItemIcon sx={{ minWidth: 36, color: activeTab === item.key ? 'text.primary' : 'text.secondary' }}>{item.icon}</ListItemIcon>
                            <ListItemText primary={item.label} primaryTypographyProps={{ variant: 'body2', fontWeight: activeTab === item.key ? 600 : 400 }} />
                        </ListItemButton>
                    ))}
                </List>
            </Box>

            {/* Bottom: Settings + Logout + Avatar */}
            <Divider />
            <Box sx={{ px: 1.5, pt: 1, pb: 0.5 }}>
                <ListItemButton sx={{ color: 'text.secondary' }} onClick={onOpenProfile}>
                    <ListItemIcon sx={{ minWidth: 36, color: 'inherit' }}><Settings sx={{ fontSize: 20 }} /></ListItemIcon>
                    <ListItemText primary="Cài đặt tài khoản" primaryTypographyProps={{ variant: 'body2' }} />
                </ListItemButton>
                <ListItemButton onClick={() => { document.cookie = 'auth-token=; max-age=0; path=/'; window.location.href = '/login'; }} sx={{ color: 'text.secondary', '&:hover': { color: 'error.main', bgcolor: '#fef2f2' } }}>
                    <ListItemIcon sx={{ minWidth: 36, color: 'inherit' }}><Logout sx={{ fontSize: 20 }} /></ListItemIcon>
                    <ListItemText primary="Đăng xuất" primaryTypographyProps={{ variant: 'body2' }} />
                </ListItemButton>
            </Box>
            <Divider />
            <Box sx={{ px: 2, py: 1.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Avatar src={user?.avatar} sx={{ width: 36, height: 36, bgcolor: 'primary.main', fontSize: 13, fontWeight: 700 }}>{user?.name?.[0]?.toUpperCase() || 'A'}</Avatar>
                <Box sx={{ minWidth: 0 }}>
                    <Typography variant="subtitle2" fontWeight={600} noWrap>{user?.name || 'Admin'}</Typography>
                    <Typography variant="caption" color="text.secondary" noWrap>{user?.role === 'ADMIN' ? 'Quản trị viên' : user?.role === 'MANAGER' ? 'Quản lý' : 'Nhân viên'}</Typography>
                </Box>
            </Box>
        </Box>
    );

    return (
        <>
            {/* Mobile drawer */}
            <Drawer variant="temporary" open={open && !isMd} onClose={onClose} sx={{ display: { md: 'none' }, '& .MuiDrawer-paper': { width: DRAWER_WIDTH, borderRight: '1px solid', borderColor: 'divider' } }}>
                {content}
            </Drawer>
            {/* Desktop sidebar */}
            <Box component="aside" sx={{ display: { xs: 'none', md: 'block' }, width: DRAWER_WIDTH, flexShrink: 0, borderRight: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', height: '100vh', position: 'sticky', top: 0 }}>
                {content}
            </Box>
        </>
    );
}

export { DRAWER_WIDTH };
