import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { Table } from '@/models/Table';
import { randomUUID } from 'crypto';

// GET /api/tables — lấy tất cả bàn
export async function GET() {
    try {
        await connectDB();
        const tables = await Table.find().populate('currentSessionId').sort({ name: 1 }).lean();
        return NextResponse.json({ success: true, data: tables });
    } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error('Get tables error:', msg);
        return NextResponse.json({ success: false, error: msg }, { status: 500 });
    }
}

// POST /api/tables — tạo bàn mới
export async function POST(req: NextRequest) {
    try {
        await connectDB();
        const body = await req.json();

        // Auto-generate QR code token
        if (!body.qrCode) {
            body.qrCode = randomUUID();
        }

        const table = await Table.create(body);
        return NextResponse.json({ success: true, data: table }, { status: 201 });
    } catch (error) {
        console.error('Create table error:', error);
        return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
    }
}
