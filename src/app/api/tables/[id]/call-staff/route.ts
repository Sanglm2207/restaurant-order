import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { Table } from '@/models/Table';
import { TableStatus } from '@/types';

// POST /api/tables/[id]/call-staff — Khách gọi nhân viên
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        await connectDB();
        const { id } = await params;

        const table = await Table.findByIdAndUpdate(
            id,
            { status: TableStatus.NEEDS_HELP },
            { new: true }
        );

        if (!table) {
            return NextResponse.json({ success: false, error: 'Bàn không tồn tại' }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            message: 'Đã gọi nhân viên',
            data: table,
        });
    } catch (error) {
        console.error('Call staff error:', error);
        return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
    }
}
