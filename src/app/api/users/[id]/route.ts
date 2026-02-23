import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { User } from '@/models/User';
import { hashPassword } from '@/lib/auth';

// PUT /api/users/[id]
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        await connectDB();
        const { id } = await params;
        const body = await req.json();
        const userToUpdate = await User.findById(id);

        if (!userToUpdate) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

        if (body.password) {
            body.password = await hashPassword(body.password);
        } else {
            delete body.password;
        }

        if (userToUpdate.isSystem) {
            // Cannot change role or deactivate a system account
            delete body.role;
            delete body.isActive;
        }

        const user = await User.findByIdAndUpdate(id, body, { new: true }).select('-password');
        return NextResponse.json({ success: true, data: user });
    } catch (error) {
        console.error('Update user error:', error);
        return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
    }
}

// DELETE /api/users/[id] — Soft delete (deactivate)
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        await connectDB();
        const { id } = await params;

        const user = await User.findById(id);
        if (!user) return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });

        if (user.isSystem) {
            return NextResponse.json({ success: false, error: 'Không thể xoá tài khoản hệ thống (Super Admin)' }, { status: 403 });
        }

        await User.findByIdAndUpdate(id, { isActive: false });
        return NextResponse.json({ success: true, message: 'Đã vô hiệu hoá' });
    } catch (error) {
        console.error('Delete user error:', error);
        return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
    }
}
