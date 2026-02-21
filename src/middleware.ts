import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const PROTECTED_ROUTES = ['/staff', '/admin'];
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret');

export async function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;

    // Only protect staff/admin routes
    const isProtected = PROTECTED_ROUTES.some(route => pathname.startsWith(route));
    if (!isProtected) return NextResponse.next();

    const token = req.cookies.get('auth-token')?.value;

    if (!token) {
        return NextResponse.redirect(new URL('/login', req.url));
    }

    try {
        const { payload } = await jwtVerify(token, JWT_SECRET);
        const role = payload.role as string;

        // Admin/Manager can access /admin
        if (pathname.startsWith('/admin') && role !== 'ADMIN' && role !== 'MANAGER') {
            return NextResponse.redirect(new URL('/staff', req.url));
        }

        // Staff can access /staff, Admin/Manager too
        if (pathname.startsWith('/staff') && !['STAFF', 'ADMIN', 'MANAGER'].includes(role)) {
            return NextResponse.redirect(new URL('/login', req.url));
        }

        return NextResponse.next();
    } catch {
        // Invalid token — redirect to login
        const response = NextResponse.redirect(new URL('/login', req.url));
        response.cookies.delete('auth-token');
        return response;
    }
}

export const config = {
    matcher: ['/staff/:path*', '/admin/:path*'],
};
