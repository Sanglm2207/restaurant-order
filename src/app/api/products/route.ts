import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { Product } from '@/models/Product';
import '@/models/Category';

// GET /api/products — lấy tất cả sản phẩm (public cho khách)
export async function GET(req: NextRequest) {
    try {
        await connectDB();
        const { searchParams } = new URL(req.url);
        const categoryId = searchParams.get('categoryId');
        const all = searchParams.get('all'); // Admin muốn xem cả hết món

        const filter: Record<string, unknown> = {};
        if (!all) filter.isAvailable = true;
        if (categoryId) filter.categoryId = categoryId;

        const products = await Product.find(filter).populate('categoryId', 'name').lean();
        return NextResponse.json({ success: true, data: products });
    } catch (error) {
        console.error('Get products error:', error);
        return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
    }
}

// POST /api/products — tạo món mới
export async function POST(req: NextRequest) {
    try {
        await connectDB();
        const body = await req.json();
        const product = await Product.create(body);
        return NextResponse.json({ success: true, data: product }, { status: 201 });
    } catch (error) {
        console.error('Create product error:', error);
        return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
    }
}
