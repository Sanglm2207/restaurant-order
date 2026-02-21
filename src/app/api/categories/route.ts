import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { Category } from '@/models/Category';

// GET /api/categories — lấy tất cả categories
export async function GET() {
    try {
        await connectDB();
        const categories = await Category.find({ isActive: true }).sort({ sortOrder: 1 }).lean();
        return NextResponse.json({ success: true, data: categories });
    } catch (error) {
        console.error('Get categories error:', error);
        return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
    }
}

// POST /api/categories — tạo category mới
export async function POST(req: NextRequest) {
    try {
        await connectDB();
        const body = await req.json();
        const category = await Category.create(body);
        return NextResponse.json({ success: true, data: category }, { status: 201 });
    } catch (error) {
        console.error('Create category error:', error);
        return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
    }
}
