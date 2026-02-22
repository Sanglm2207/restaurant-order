import { NextResponse, NextRequest } from 'next/server';
import { uploadToS3, deleteFromS3, getKeyFromUrl } from '@/lib/s3';

import { randomUUID } from 'crypto';

function generateId() {
    return randomUUID();
}

/**
 * POST /api/upload
 * Upload a file to S3.
 * Body: multipart/form-data with field "file" and optional "folder" (products | avatars)
 * Optionally "oldUrl" to delete the previous file.
 */
export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File | null;
        const folder = (formData.get('folder') as string) || 'uploads';
        const oldUrl = formData.get('oldUrl') as string | null;

        if (!file) {
            return NextResponse.json({ success: false, error: 'Chưa chọn file' }, { status: 400 });
        }

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        if (!allowedTypes.includes(file.type)) {
            return NextResponse.json({ success: false, error: 'Chỉ chấp nhận ảnh JPG, PNG, WebP, GIF' }, { status: 400 });
        }

        // Max 5MB
        if (file.size > 5 * 1024 * 1024) {
            return NextResponse.json({ success: false, error: 'File quá lớn (tối đa 5MB)' }, { status: 400 });
        }

        // Delete old file if exists
        if (oldUrl) {
            const oldKey = getKeyFromUrl(oldUrl);
            if (oldKey) {
                try { await deleteFromS3(oldKey); } catch { /* ignore */ }
            }
        }

        // Generate unique key
        const ext = file.name.split('.').pop() || 'jpg';
        const key = `restaurant/${folder}/${generateId()}.${ext}`;

        // Upload
        const buffer = Buffer.from(await file.arrayBuffer());
        const url = await uploadToS3(buffer, key, file.type);

        return NextResponse.json({ success: true, data: { url, key } });
    } catch (error) {
        console.error('Upload error:', error);
        return NextResponse.json({ success: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 });
    }
}
