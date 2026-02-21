import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { User } from '@/models/User';
import { hashPassword } from '@/lib/auth';

// GET /api/users — danh sách nhân viên
export async function GET() {
    try {
        await connectDB();
        const users = await User.find().select('-password').sort({ createdAt: -1 }).lean();
        return NextResponse.json({ success: true, data: users });
    } catch (error) {
        console.error('Get users error:', error);
        return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
    }
}

// POST /api/users — tạo nhân viên mới (admin only)
export async function POST(req: NextRequest) {
    try {
        await connectDB();
        const { name, email, password, role } = await req.json();

        const existing = await User.findOne({ email });
        if (existing) {
            return NextResponse.json({ success: false, error: 'Email đã tồn tại' }, { status: 400 });
        }

        const hashed = await hashPassword(password);
        const user = await User.create({ name, email, password: hashed, role });

        const { password: _, ...userWithoutPassword } = user.toObject();
        return NextResponse.json({ success: true, data: userWithoutPassword }, { status: 201 });
    } catch (error) {
        console.error('Create user error:', error);
        return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
    }
}
