import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { Category } from '@/models/Category';

// PUT /api/categories/[id]
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        await connectDB();
        const { id } = await params;
        const body = await req.json();
        const category = await Category.findByIdAndUpdate(id, body, { new: true });
        if (!category) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
        return NextResponse.json({ success: true, data: category });
    } catch (error) {
        console.error('Update category error:', error);
        return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
    }
}

// DELETE /api/categories/[id]
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        await connectDB();
        const { id } = await params;
        await Category.findByIdAndUpdate(id, { isActive: false });
        return NextResponse.json({ success: true, message: 'Đã xoá' });
    } catch (error) {
        console.error('Delete category error:', error);
        return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
    }
}
