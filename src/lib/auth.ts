import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import connectDB from './db';
import { User } from '@/models/User';
import { UserRole, type IUser } from '@/types';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

export interface JWTPayload {
    userId: string;
    email: string;
    role: UserRole;
}

export async function hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hashed: string): Promise<boolean> {
    return bcrypt.compare(password, hashed);
}

export function generateToken(payload: JWTPayload): string {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): JWTPayload | null {
    try {
        return jwt.verify(token, JWT_SECRET) as JWTPayload;
    } catch {
        return null;
    }
}

export async function getCurrentUser(): Promise<(Omit<IUser, 'password'> & { _id: string }) | null> {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('auth-token')?.value;
        if (!token) return null;

        const payload = verifyToken(token);
        if (!payload) return null;

        await connectDB();
        const user = await User.findById(payload.userId).select('-password').lean();
        if (!user) return null;

        return { ...user, _id: user._id.toString() } as Omit<IUser, 'password'> & { _id: string };
    } catch {
        return null;
    }
}

export async function requireAuth(allowedRoles?: UserRole[]) {
    const user = await getCurrentUser();
    if (!user) {
        throw new Error('Unauthorized');
    }
    if (allowedRoles && !allowedRoles.includes(user.role as UserRole)) {
        throw new Error('Forbidden');
    }
    return user;
}
