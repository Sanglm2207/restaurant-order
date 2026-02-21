'use client';

import { useState, useRef } from 'react';
import { Box, IconButton, CircularProgress, Typography } from '@mui/material';
import { CloudUpload, Close } from '@mui/icons-material';

interface Props {
    value?: string;
    onChange: (url: string | undefined) => void;
    folder: 'products' | 'avatars' | 'receipts';
    shape?: 'square' | 'circle';
    size?: number;
}

export default function ImageUpload({ value, onChange, folder, shape = 'square', size = 120 }: Props) {
    const [uploading, setUploading] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleFile = async (file: File) => {
        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('folder', folder);
            if (value) formData.append('oldUrl', value);

            const res = await fetch('/api/upload', { method: 'POST', body: formData });
            const data = await res.json();
            if (data.success) {
                onChange(data.data.url);
            } else {
                alert(data.error || 'Lỗi upload');
            }
        } catch {
            alert('Lỗi mạng');
        }
        setUploading(false);
    };

    const handleRemove = () => {
        onChange(undefined);
    };

    const borderRadius = shape === 'circle' ? '50%' : 2;

    return (
        <Box sx={{ position: 'relative', display: 'inline-block' }}>
            <Box
                onClick={() => !uploading && inputRef.current?.click()}
                sx={{
                    width: size,
                    height: size,
                    borderRadius,
                    border: '2px dashed',
                    borderColor: value ? 'transparent' : '#e5e7eb',
                    bgcolor: value ? 'transparent' : '#f9fafb',
                    cursor: uploading ? 'wait' : 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    transition: 'border-color 0.2s',
                    '&:hover': { borderColor: value ? 'transparent' : 'primary.main' },
                }}
            >
                {uploading ? (
                    <CircularProgress size={24} />
                ) : value ? (
                    <Box component="img" src={value} alt="Preview" sx={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius }} />
                ) : (
                    <>
                        <CloudUpload sx={{ fontSize: 28, color: 'text.disabled', mb: 0.5 }} />
                        <Typography variant="caption" color="text.disabled">Tải ảnh</Typography>
                    </>
                )}
            </Box>

            {value && !uploading && (
                <IconButton
                    size="small"
                    onClick={(e) => { e.stopPropagation(); handleRemove(); }}
                    sx={{
                        position: 'absolute', top: -8, right: -8,
                        width: 22, height: 22,
                        bgcolor: '#ef4444', color: '#fff',
                        '&:hover': { bgcolor: '#dc2626' },
                    }}
                >
                    <Close sx={{ fontSize: 14 }} />
                </IconButton>
            )}

            <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                style={{ display: 'none' }}
                onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) handleFile(file);
                    e.target.value = '';
                }}
            />
        </Box>
    );
}
