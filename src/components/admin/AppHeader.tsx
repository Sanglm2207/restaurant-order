'use client';

import { ReactNode } from 'react';
import { AppBar, Toolbar, Typography, Box, IconButton, InputBase, useTheme, useMediaQuery } from '@mui/material';
import { Menu as MenuIcon, Search as SearchIcon } from '@mui/icons-material';

interface Props {
    title: string;
    breadcrumb?: string;
    onMenuClick: () => void;
    searchValue: string;
    onSearchChange: (value: string) => void;
    actions?: ReactNode;
}

export default function AppHeader({ title, breadcrumb, onMenuClick, searchValue, onSearchChange, actions }: Props) {
    const theme = useTheme();
    const isMd = useMediaQuery(theme.breakpoints.up('md'));

    return (
        <AppBar position="static" elevation={0} sx={{ bgcolor: 'background.paper', borderBottom: '1px solid', borderColor: 'divider' }}>
            <Toolbar sx={{ height: 64, px: { xs: 2, md: 3 } }}>
                {!isMd && (
                    <IconButton edge="start" onClick={onMenuClick} sx={{ mr: 1, color: 'text.secondary' }}>
                        <MenuIcon />
                    </IconButton>
                )}
                <Box sx={{ flex: 1 }}>
                    <Typography variant="h5" color="text.primary">{title}</Typography>
                    {breadcrumb && <Typography variant="caption">Dashboard · {breadcrumb}</Typography>}
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{ display: { xs: 'none', sm: 'flex' }, alignItems: 'center', bgcolor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 2, px: 1.5, height: 36, width: 260 }}>
                        <SearchIcon sx={{ fontSize: 18, color: 'text.disabled', mr: 1 }} />
                        <InputBase
                            placeholder="Tìm kiếm (Ctrl+/)"
                            value={searchValue}
                            onChange={e => onSearchChange(e.target.value)}
                            sx={{ fontSize: 13, flex: 1 }}
                        />
                    </Box>
                    {actions}
                </Box>
            </Toolbar>
        </AppBar>
    );
}
