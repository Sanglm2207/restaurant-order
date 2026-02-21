import { Schema, model, models } from 'mongoose';
import { UserRole } from '@/types';

const UserSchema = new Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    avatar: { type: String },
    role: {
        type: String,
        enum: Object.values(UserRole),
        default: UserRole.STAFF,
    },
    isActive: { type: Boolean, default: true },
    isSystem: { type: Boolean, default: false }, // Hệ thống, không thể bị xoá
}, { timestamps: true });

export const User = models.User || model('User', UserSchema);
