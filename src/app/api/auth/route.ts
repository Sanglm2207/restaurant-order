import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { User } from '@/models/User';
import { hashPassword, verifyPassword, generateToken } from '@/lib/auth';
import { UserRole } from '@/types';

// POST /api/auth/login
export async function POST(req: NextRequest) {
    try {
        await connectDB();
        const { email, password, action } = await req.json();

        // ============ REGISTER (seed admin) ============
        if (action === 'register') {
            const existing = await User.findOne({ email });
            if (existing) {
                return NextResponse.json({ success: false, error: 'Email đã tồn tại' }, { status: 400 });
            }

            const hashed = await hashPassword(password);
            const user = await User.create({
                name: email.split('@')[0],
                email,
                password: hashed,
                role: UserRole.ADMIN,
            });

            const token = generateToken({
                userId: user._id.toString(),
                email: user.email,
                role: user.role,
            });

            const response = NextResponse.json({
                success: true,
                data: { userId: user._id, role: user.role },
            });

            response.cookies.set('auth-token', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 7 * 24 * 60 * 60, // 7 days
                path: '/',
            });

            return response;
        }

        // ============ LOGIN ============
        if (!email || !password) {
            return NextResponse.json({ success: false, error: 'Email và mật khẩu là bắt buộc' }, { status: 400 });
        }

        const user = await User.findOne({ email, isActive: true });
        if (!user) {
            return NextResponse.json({ success: false, error: 'Tài khoản không tồn tại' }, { status: 401 });
        }

        const isValid = await verifyPassword(password, user.password);
        if (!isValid) {
            return NextResponse.json({ success: false, error: 'Mật khẩu không đúng' }, { status: 401 });
        }

        const token = generateToken({
            userId: user._id.toString(),
            email: user.email,
            role: user.role,
        });

        const response = NextResponse.json({
            success: true,
            data: {
                userId: user._id,
                name: user.name,
                role: user.role,
            },
        });

        response.cookies.set('auth-token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60,
            path: '/',
        });

        return response;
    } catch (error) {
        console.error('Auth error:', error);
        return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
    }
}
