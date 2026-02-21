import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { Table } from '@/models/Table';

// PUT /api/tables/[id]
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        await connectDB();
        const { id } = await params;
        const body = await req.json();
        const table = await Table.findByIdAndUpdate(id, body, { new: true });
        if (!table) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
        return NextResponse.json({ success: true, data: table });
    } catch (error) {
        console.error('Update table error:', error);
        return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
    }
}

// DELETE /api/tables/[id]
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        await connectDB();
        const { id } = await params;
        await Table.findByIdAndDelete(id);
        return NextResponse.json({ success: true, message: 'Đã xoá bàn' });
    } catch (error) {
        console.error('Delete table error:', error);
        return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
    }
}
