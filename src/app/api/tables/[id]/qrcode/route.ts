import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';
import connectDB from '@/lib/db';
import { Table } from '@/models/Table';

// GET /api/tables/[id]/qrcode — Generate QR code image
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await connectDB();
        const { id } = await params;
        const table = await Table.findById(id);
        if (!table) {
            return NextResponse.json({ success: false, error: 'Bàn không tồn tại' }, { status: 404 });
        }

        // Build the permanent QR URL
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const orderUrl = `${appUrl}/order/${table._id}`;

        // Check format param
        const format = req.nextUrl.searchParams.get('format') || 'png';

        if (format === 'dataurl') {
            // Return as data URL (for preview in browser)
            const dataUrl = await QRCode.toDataURL(orderUrl, {
                width: 512,
                margin: 2,
                color: {
                    dark: '#000000',
                    light: '#FFFFFF',
                },
                errorCorrectionLevel: 'H', // Highest error correction
            });

            return NextResponse.json({
                success: true,
                data: {
                    tableId: table._id,
                    tableName: table.name,
                    orderUrl,
                    qrDataUrl: dataUrl,
                },
            });
        }

        // Return as PNG image (for download)
        const qrBuffer = await QRCode.toBuffer(orderUrl, {
            type: 'png',
            width: 1024, // High-res for printing
            margin: 3,
            color: {
                dark: '#000000',
                light: '#FFFFFF',
            },
            errorCorrectionLevel: 'H',
        });

        return new NextResponse(new Uint8Array(qrBuffer), {
            headers: {
                'Content-Type': 'image/png',
                'Content-Disposition': `attachment; filename="qr-${table.name.replace(/\s+/g, '-')}.png"`,
                'Cache-Control': 'public, max-age=31536000, immutable', // Cache 1 year — QR never expires
            },
        });
    } catch (error) {
        console.error('QR generation error:', error);
        return NextResponse.json({ success: false, error: 'Lỗi tạo QR code' }, { status: 500 });
    }
}
