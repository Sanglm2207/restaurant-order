'use client';

import { ReactNode, forwardRef } from 'react';
import {
    TextField, TextFieldProps, Button, ButtonProps, Select, SelectProps,
    FormControl, InputLabel, Card, CardProps, Dialog, DialogTitle, DialogContent,
    DialogActions, Chip, ChipProps, Box, Typography, IconButton,
} from '@mui/material';
import { Close } from '@mui/icons-material';

/* ── Styled Input ── */
export const StyledInput = forwardRef<HTMLInputElement, TextFieldProps>((props, ref) => (
    <TextField inputRef={ref} variant="outlined" size="small" fullWidth {...props} />
));
StyledInput.displayName = 'StyledInput';

/* ── Styled Select ── */
export function StyledSelect({ label, children, ...props }: SelectProps & { label?: string }) {
    return (
        <FormControl fullWidth size="small">
            {label && <InputLabel sx={{ fontSize: 14 }}>{label}</InputLabel>}
            <Select label={label} {...props}>{children}</Select>
        </FormControl>
    );
}

/* ── Primary Button ── */
export function PrimaryButton({ children, ...props }: ButtonProps) {
    return <Button variant="contained" color="primary" {...props}>{children}</Button>;
}

/* ── Outlined Button ── */
export function OutlinedButton({ children, ...props }: ButtonProps) {
    return <Button variant="outlined" {...props}>{children}</Button>;
}

/* ── Category Chip ── */
export function CategoryChip({ active, ...props }: ChipProps & { active?: boolean }) {
    return (
        <Chip
            variant={active ? 'filled' : 'outlined'}
            color={active ? 'primary' : 'default'}
            clickable
            sx={{
                borderRadius: '20px',
                fontWeight: 500,
                ...(active ? {} : { borderColor: 'transparent', bgcolor: 'transparent', color: 'text.secondary', '&:hover': { bgcolor: '#f3f4f6' } }),
            }}
            {...props}
        />
    );
}

/* ── Stat Card ── */
interface StatCardProps { title: string; value: string | number; icon: ReactNode; color: string; bgcolor: string }
export function StatCard({ title, value, icon, color, bgcolor }: StatCardProps) {
    return (
        <Card sx={{ p: 2.5, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>{title}</Typography>
                <Typography variant="h5" sx={{ color, fontWeight: 700 }}>{value}</Typography>
            </Box>
            <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                {icon}
            </Box>
        </Card>
    );
}

/* ── Product Card ── */
interface ProductCardProps {
    name: string;
    price: string;
    image?: string;
    available: boolean;
    onEdit: () => void;
    onDelete: () => void;
    onToggle: () => void;
}

export function ProductCard({ name, price, image, available, onEdit, onDelete, onToggle }: ProductCardProps) {
    return (
        <Card
            sx={{
                overflow: 'hidden',
                cursor: 'pointer',
                transition: 'box-shadow 0.2s',
                opacity: available ? 1 : 0.4,
                filter: available ? 'none' : 'grayscale(1)',
                '&:hover': { boxShadow: '0 4px 12px rgba(0,0,0,0.08)' },
                '&:hover .product-actions': { opacity: 1 },
                '&:hover .product-plus': { opacity: 1 },
            }}
        >
            {/* Image */}
            <Box sx={{ position: 'relative', p: 2, pb: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {image ? (
                    <Box component="img" src={image} alt={name} sx={{ width: '100%', height: 96, objectFit: 'contain' }} />
                ) : (
                    <Box sx={{ width: 96, height: 96, borderRadius: '50%', bgcolor: 'rgba(249,115,22,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36 }}>
                        🍽️
                    </Box>
                )}
                {/* + button */}
                <IconButton
                    className="product-plus"
                    onClick={onEdit}
                    size="small"
                    sx={{ position: 'absolute', bottom: 4, right: 12, opacity: 0, transition: 'opacity 0.2s', bgcolor: 'primary.main', color: '#fff', width: 28, height: 28, fontSize: 18, '&:hover': { bgcolor: 'primary.dark' } }}
                >+</IconButton>
            </Box>
            {/* Info */}
            <Box sx={{ px: 2, pb: 1.5 }}>
                <Typography variant="subtitle2" noWrap>{name}</Typography>
                <Typography variant="subtitle2" color="primary" fontWeight={700} sx={{ mt: 0.25 }}>{price}</Typography>
            </Box>
            {/* Actions */}
            <Box className="product-actions" sx={{ display: 'flex', borderTop: '1px solid #f5f5f5', opacity: 0, transition: 'opacity 0.2s' }}>
                <Box component="button" onClick={onToggle} sx={{ flex: 1, py: 0.75, border: 0, bgcolor: 'transparent', cursor: 'pointer', fontSize: 12, color: '#9ca3af', '&:hover': { color: 'primary.main', bgcolor: 'primary.light' } }}>
                    {available ? 'Hết món' : 'Còn món'}
                </Box>
                <Box component="button" onClick={onDelete} sx={{ flex: 1, py: 0.75, border: 0, bgcolor: 'transparent', cursor: 'pointer', fontSize: 12, color: '#9ca3af', borderLeft: '1px solid #f5f5f5', '&:hover': { color: 'error.main', bgcolor: '#fef2f2' } }}>
                    Xóa
                </Box>
            </Box>
        </Card>
    );
}

/* ── Form Modal ── */
interface FormModalProps {
    open: boolean;
    onClose: () => void;
    title: string;
    onSave: () => void;
    children: ReactNode;
}

export function FormModal({ open, onClose, title, onSave, children }: FormModalProps) {
    return (
        <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
                <Typography variant="h6">{title}</Typography>
                <IconButton size="small" onClick={onClose}><Close fontSize="small" /></IconButton>
            </DialogTitle>
            <DialogContent sx={{ pt: 2 }}>{children}</DialogContent>
            <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
                <Button variant="outlined" onClick={onClose} sx={{ flex: 1 }}>Huỷ</Button>
                <Button variant="contained" color="primary" onClick={onSave} sx={{ flex: 1 }}>Lưu</Button>
            </DialogActions>
        </Dialog>
    );
}

/* ── Section Container (white card wrapper) ── */
export function SectionContainer({ children, ...props }: CardProps) {
    return (
        <Card sx={{ p: 3, ...props.sx }} {...props}>
            {children}
        </Card>
    );
}
