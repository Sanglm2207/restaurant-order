import { Types } from 'mongoose';

// ============================================================
// ENUMS
// ============================================================
export enum UserRole {
    ADMIN = 'ADMIN',
    MANAGER = 'MANAGER',
    STAFF = 'STAFF',
}

export enum TableStatus {
    AVAILABLE = 'AVAILABLE',       // Xanh - Trống
    OCCUPIED = 'OCCUPIED',         // Vàng - Đang có khách
    NEEDS_HELP = 'NEEDS_HELP',    // Đỏ - Chờ hỗ trợ
    PAYMENT_REQUESTED = 'PAYMENT_REQUESTED', // Tím - Chờ thanh toán
    CLEANING = 'CLEANING',        // Xám - Đã thanh toán chờ dọn
}

export enum SessionStatus {
    OPEN = 'OPEN',
    PAYMENT_REQUESTED = 'PAYMENT_REQUESTED',
    WAITING_PAYMENT = 'WAITING_PAYMENT',
    PAID = 'PAID',
    CLOSED = 'CLOSED',
}

export enum OrderItemStatus {
    PENDING = 'PENDING',
    CONFIRMED = 'CONFIRMED',
    PREPARING = 'PREPARING',
    SERVED = 'SERVED',
    CANCELLED = 'CANCELLED',
}

export enum PaymentMethod {
    CASH = 'CASH',
    QR_ONLINE = 'QR_ONLINE',
    POS = 'POS',
}

export enum PaymentStatus {
    PENDING = 'PENDING',
    SUCCESS = 'SUCCESS',
    FAILED = 'FAILED',
    REFUNDED = 'REFUNDED',
}

// ============================================================
// INTERFACES
// ============================================================
export interface IUser {
    _id: Types.ObjectId;
    name: string;
    email: string;
    password: string;
    role: UserRole;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface ICategory {
    _id: Types.ObjectId;
    name: string;
    description?: string;
    sortOrder: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface IProduct {
    _id: Types.ObjectId;
    name: string;
    description?: string;
    price: number;
    image?: string;
    categoryId: Types.ObjectId;
    isAvailable: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface ITable {
    _id: Types.ObjectId;
    name: string;
    zone?: string;
    qrCode: string;
    capacity: number;
    currentSessionId?: Types.ObjectId | null;
    status: TableStatus;
    createdAt: Date;
    updatedAt: Date;
}

export interface IOrderItem {
    _id: Types.ObjectId;
    productId: Types.ObjectId;
    name: string;
    price: number;
    quantity: number;
    note?: string;
    status: OrderItemStatus;
}

export interface IOrder {
    _id: Types.ObjectId;
    sessionId: Types.ObjectId;
    items: IOrderItem[];
    createdBy?: string; // 'customer' | staff userId
    createdAt: Date;
}

export interface ISession {
    _id: Types.ObjectId;
    tableId: Types.ObjectId;
    status: SessionStatus;
    totalAmount: number;
    paymentMethod?: PaymentMethod | null;
    startedAt: Date;
    endedAt?: Date;
}

export interface IPayment {
    _id: Types.ObjectId;
    sessionId: Types.ObjectId;
    amount: number;
    method: PaymentMethod;
    status: PaymentStatus;
    transactionId?: string;
    paidAt?: Date;
    confirmedBy?: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

// ============================================================
// WEBSOCKET EVENT TYPES
// ============================================================
export enum WSEventType {
    // Order events
    NEW_ORDER = 'NEW_ORDER',
    ORDER_CONFIRMED = 'ORDER_CONFIRMED',
    ORDER_STATUS_UPDATE = 'ORDER_STATUS_UPDATE',

    // Session events
    SESSION_CREATED = 'SESSION_CREATED',
    SESSION_STATUS_UPDATE = 'SESSION_STATUS_UPDATE',

    // Table events
    TABLE_STATUS_UPDATE = 'TABLE_STATUS_UPDATE',
    CALL_STAFF = 'CALL_STAFF',

    // Payment events
    PAYMENT_REQUESTED = 'PAYMENT_REQUESTED',
    PAYMENT_SUCCESS = 'PAYMENT_SUCCESS',
    PAYMENT_FAILED = 'PAYMENT_FAILED',

    // Menu events
    MENU_ITEM_UPDATE = 'MENU_ITEM_UPDATE',
}

export interface WSMessage {
    type: WSEventType;
    payload: Record<string, unknown>;
    tableId?: string;
    sessionId?: string;
    timestamp: number;
}

// ============================================================
// API RESPONSE TYPES
// ============================================================
export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}
