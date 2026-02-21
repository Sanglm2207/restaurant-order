import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// POST /api/auth/logout
export async function POST() {
    const cookieStore = await cookies();
    cookieStore.delete('auth-token');
    return NextResponse.json({ success: true, message: 'Đã đăng xuất' });
}
