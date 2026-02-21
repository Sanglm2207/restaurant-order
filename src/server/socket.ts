import WebSocket, { WebSocketServer } from 'ws';
import mongoose from 'mongoose';
import 'dotenv/config';
import { WSEventType, type WSMessage } from '../types';

// ============================================================
// EXTENDED WEBSOCKET
// ============================================================
interface ExtendedWebSocket extends WebSocket {
    role?: string;       // 'staff' | 'customer' | 'admin'
    tableId?: string;
    sessionId?: string;
    isAlive?: boolean;
}

const PORT = Number(process.env.WS_PORT) || 8080;
const wss = new WebSocketServer({ port: PORT });

console.log(`🚀 WebSocket Server running on port ${PORT}`);

// ============================================================
// HEARTBEAT — detect dead connections
// ============================================================
const heartbeatInterval = setInterval(() => {
    wss.clients.forEach((ws) => {
        const client = ws as ExtendedWebSocket;
        if (client.isAlive === false) return client.terminate();
        client.isAlive = false;
        client.ping();
    });
}, 30000);

wss.on('close', () => clearInterval(heartbeatInterval));

// ============================================================
// CONNECTION HANDLER
// ============================================================
wss.on('connection', (ws: ExtendedWebSocket, req) => {
    const url = new URL(req.url ?? '', 'http://localhost');
    const role = url.searchParams.get('role') ?? 'customer';
    const tableId = url.searchParams.get('tableId') ?? undefined;
    const sessionId = url.searchParams.get('sessionId') ?? undefined;

    ws.role = role;
    ws.tableId = tableId;
    ws.sessionId = sessionId;
    ws.isAlive = true;

    console.log(`✅ Connected: ${role} | table: ${tableId ?? 'N/A'} | session: ${sessionId ?? 'N/A'}`);

    ws.on('pong', () => {
        ws.isAlive = true;
    });

    // Handle incoming messages từ client
    ws.on('message', (data) => {
        try {
            const message: WSMessage = JSON.parse(data.toString());
            handleClientMessage(ws, message);
        } catch (err) {
            console.error('Invalid message:', err);
        }
    });

    ws.on('close', () => {
        console.log(`❌ Disconnected: ${role} | table: ${tableId ?? 'N/A'}`);
    });

    ws.on('error', (err) => {
        console.error('WebSocket error:', err);
    });
});

// ============================================================
// MESSAGE HANDLER
// ============================================================
function handleClientMessage(sender: ExtendedWebSocket, message: WSMessage) {
    switch (message.type) {
        case WSEventType.CALL_STAFF:
            // Khách gọi nhân viên → broadcast cho all staff
            broadcastToRole('staff', {
                type: WSEventType.CALL_STAFF,
                payload: {
                    tableId: sender.tableId,
                    ...message.payload,
                },
                tableId: sender.tableId,
                timestamp: Date.now(),
            });
            break;

        case WSEventType.NEW_ORDER:
            // Order mới → broadcast cho staff
            broadcastToRole('staff', {
                ...message,
                timestamp: Date.now(),
            });
            // Cũng gửi lại cho admin
            broadcastToRole('admin', {
                ...message,
                timestamp: Date.now(),
            });
            break;

        case WSEventType.ORDER_CONFIRMED:
        case WSEventType.ORDER_STATUS_UPDATE:
            // Staff confirmed/update order → broadcast cho customer bàn đó
            if (message.tableId) {
                broadcastToTable(message.tableId, {
                    ...message,
                    timestamp: Date.now(),
                });
            }
            // Cũng broadcast cho staff khác
            broadcastToRole('staff', {
                ...message,
                timestamp: Date.now(),
            });
            break;

        case WSEventType.SESSION_STATUS_UPDATE:
        case WSEventType.TABLE_STATUS_UPDATE:
            // Broadcast cho cả staff và customer of that table
            broadcastToRole('staff', { ...message, timestamp: Date.now() });
            broadcastToRole('admin', { ...message, timestamp: Date.now() });
            if (message.tableId) {
                broadcastToTable(message.tableId, { ...message, timestamp: Date.now() });
            }
            break;

        case WSEventType.PAYMENT_REQUESTED:
        case WSEventType.PAYMENT_SUCCESS:
        case WSEventType.PAYMENT_FAILED:
            broadcastToRole('staff', { ...message, timestamp: Date.now() });
            broadcastToRole('admin', { ...message, timestamp: Date.now() });
            if (message.tableId) {
                broadcastToTable(message.tableId, { ...message, timestamp: Date.now() });
            }
            break;

        case WSEventType.MENU_ITEM_UPDATE:
            // Broadcast cho tất cả
            broadcastAll({ ...message, timestamp: Date.now() });
            break;

        default:
            console.warn('Unknown message type:', message.type);
    }
}

// ============================================================
// BROADCAST HELPERS
// ============================================================
function broadcastToRole(role: string, data: WSMessage) {
    wss.clients.forEach((client) => {
        const ws = client as ExtendedWebSocket;
        if (ws.readyState === WebSocket.OPEN && ws.role === role) {
            ws.send(JSON.stringify(data));
        }
    });
}

function broadcastToTable(tableId: string, data: WSMessage) {
    wss.clients.forEach((client) => {
        const ws = client as ExtendedWebSocket;
        if (ws.readyState === WebSocket.OPEN && ws.tableId === tableId) {
            ws.send(JSON.stringify(data));
        }
    });
}

function broadcastAll(data: WSMessage) {
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    });
}

// ============================================================
// MONGODB CHANGE STREAM WATCHER
// ============================================================
const MONGODB_URI = process.env.MONGODB_URI;
if (MONGODB_URI) {
    mongoose.connect(MONGODB_URI).then(() => {
        console.log('🔥 WebSocket Server connected to MongoDB');
        startChangeStreamWatchers();
    }).catch((err) => {
        console.error('MongoDB connection error:', err);
    });
}

function startChangeStreamWatchers() {
    // Watch orders
    const orderStream = mongoose.connection.collection('orders').watch();
    orderStream.on('change', (change) => {
        if (change.operationType === 'insert') {
            broadcastToRole('staff', {
                type: WSEventType.NEW_ORDER,
                payload: { order: change.fullDocument },
                timestamp: Date.now(),
            });
        }
    });

    // Watch sessions
    const sessionStream = mongoose.connection.collection('sessions').watch();
    sessionStream.on('change', (change) => {
        if (change.operationType === 'update' && change.updateDescription?.updatedFields) {
            const fields = change.updateDescription.updatedFields;

            if (fields.status) {
                const sessionId = change.documentKey._id.toString();

                // Map status sang WS event
                let eventType: WSEventType = WSEventType.SESSION_STATUS_UPDATE;
                if (fields.status === 'PAYMENT_REQUESTED') eventType = WSEventType.PAYMENT_REQUESTED;
                if (fields.status === 'PAID') eventType = WSEventType.PAYMENT_SUCCESS;

                broadcastToRole('staff', {
                    type: eventType,
                    payload: { sessionId, status: fields.status },
                    sessionId,
                    timestamp: Date.now(),
                });

                broadcastToRole('admin', {
                    type: eventType,
                    payload: { sessionId, status: fields.status },
                    sessionId,
                    timestamp: Date.now(),
                });
            }
        }
    });

    // Watch tables
    const tableStream = mongoose.connection.collection('tables').watch();
    tableStream.on('change', (change) => {
        if (change.operationType === 'update' && change.updateDescription?.updatedFields) {
            const fields = change.updateDescription.updatedFields;
            if (fields.status) {
                broadcastToRole('staff', {
                    type: WSEventType.TABLE_STATUS_UPDATE,
                    payload: {
                        tableId: change.documentKey._id.toString(),
                        status: fields.status,
                    },
                    timestamp: Date.now(),
                });
            }
        }
    });

    console.log('👀 Change stream watchers started');
}
