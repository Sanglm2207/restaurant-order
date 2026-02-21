'use client';

import { createTheme } from '@mui/material/styles';

const theme = createTheme({
    palette: {
        primary: { main: '#f97316', light: '#fff7ed', dark: '#ea580c', contrastText: '#fff' },
        secondary: { main: '#1e293b', light: '#475569', dark: '#0f172a' },
        error: { main: '#ef4444' },
        warning: { main: '#eab308' },
        success: { main: '#22c55e' },
        background: { default: '#f5f5f7', paper: '#ffffff' },
        text: { primary: '#111827', secondary: '#6b7280', disabled: '#d1d5db' },
        divider: '#f0f0f0',
    },
    typography: {
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
        h5: { fontWeight: 700, fontSize: '1.125rem' },
        h6: { fontWeight: 700, fontSize: '1rem' },
        subtitle1: { fontWeight: 600, fontSize: '0.875rem' },
        subtitle2: { fontWeight: 500, fontSize: '0.8125rem' },
        body1: { fontSize: '0.875rem' },
        body2: { fontSize: '0.8125rem' },
        caption: { fontSize: '0.75rem', color: '#9ca3af' },
        button: { textTransform: 'none', fontWeight: 600 },
    },
    shape: { borderRadius: 8 },
    components: {
        MuiButton: {
            styleOverrides: {
                root: { borderRadius: 8, height: 40, boxShadow: 'none', '&:hover': { boxShadow: 'none' } },
                sizeMedium: { padding: '0 20px', fontSize: '0.875rem' },
                sizeSmall: { height: 34, padding: '0 14px', fontSize: '0.8125rem' },
                contained: { '&:hover': { boxShadow: 'none' } },
                outlined: { borderColor: '#e5e7eb', color: '#4b5563', '&:hover': { borderColor: '#d1d5db', backgroundColor: '#f9fafb' } },
            },
            defaultProps: { disableElevation: true },
        },
        MuiTextField: {
            styleOverrides: {
                root: {
                    '& .MuiOutlinedInput-root': {
                        borderRadius: 8,
                        fontSize: '0.875rem',
                        backgroundColor: '#fff',
                        '& fieldset': { borderColor: '#e5e7eb' },
                        '&:hover fieldset': { borderColor: '#d1d5db' },
                        '&.Mui-focused fieldset': { borderColor: '#f97316', borderWidth: 1 },
                    },
                    '& .MuiInputLabel-root': { fontSize: '0.875rem' },
                },
            },
            defaultProps: { size: 'small', fullWidth: true },
        },
        MuiOutlinedInput: {
            styleOverrides: {
                root: {
                    borderRadius: 8,
                    fontSize: '0.875rem',
                    backgroundColor: '#fff',
                    '& fieldset': { borderColor: '#e5e7eb' },
                    '&:hover fieldset': { borderColor: '#d1d5db' },
                    '&.Mui-focused fieldset': { borderColor: '#f97316', borderWidth: 1 },
                },
                input: { padding: '8.5px 14px' },
            },
        },
        MuiSelect: {
            styleOverrides: {
                root: { borderRadius: 8, fontSize: '0.875rem', backgroundColor: '#fff' },
            },
            defaultProps: { size: 'small' },
        },
        MuiCard: {
            styleOverrides: {
                root: { borderRadius: 12, border: '1px solid #f0f0f0', boxShadow: 'none' },
            },
        },
        MuiDialog: {
            styleOverrides: {
                paper: { borderRadius: 16, padding: 8, boxShadow: '0 8px 30px rgba(0,0,0,0.12)' },
            },
        },
        MuiChip: {
            styleOverrides: {
                root: { borderRadius: 20, fontWeight: 500, fontSize: '0.8125rem' },
            },
        },
        MuiListItemButton: {
            styleOverrides: {
                root: {
                    borderRadius: 8,
                    padding: '8px 12px',
                    marginBottom: 2,
                    '&.Mui-selected': { backgroundColor: '#f3f4f6', color: '#111827', fontWeight: 600, '&:hover': { backgroundColor: '#e5e7eb' } },
                    '&:hover': { backgroundColor: '#f9fafb' },
                },
            },
        },
        MuiDivider: {
            styleOverrides: { root: { borderColor: '#f0f0f0' } },
        },
        MuiInputLabel: {
            styleOverrides: { root: { fontSize: '0.875rem', fontWeight: 500, color: '#4b5563', marginBottom: 6 } },
        },
    },
});

export default theme;
