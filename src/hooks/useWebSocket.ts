'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import type { WSMessage } from '@/types';

interface UseWebSocketOptions {
    role: 'customer' | 'staff' | 'admin';
    tableId?: string;
    sessionId?: string;
    onMessage?: (message: WSMessage) => void;
    autoConnect?: boolean;
}

export function useWebSocket({
    role,
    tableId,
    sessionId,
    onMessage,
    autoConnect = true,
}: UseWebSocketOptions) {
    const wsRef = useRef<WebSocket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const reconnectAttempts = useRef(0);
    const MAX_RECONNECT_ATTEMPTS = 10;

    const onMessageRef = useRef(onMessage);
    const connectFnRef = useRef<(() => void) | null>(null);

    useEffect(() => {
        onMessageRef.current = onMessage;
    }, [onMessage]);

    const doConnect = useCallback(() => {
        const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080';
        const params = new URLSearchParams({ role });
        if (tableId) params.set('tableId', tableId);
        if (sessionId) params.set('sessionId', sessionId);

        const ws = new WebSocket(`${wsUrl}?${params.toString()}`);
        wsRef.current = ws;

        ws.onopen = () => {
            console.log('WebSocket connected');
            setIsConnected(true);
            reconnectAttempts.current = 0;
        };

        ws.onmessage = (event) => {
            try {
                const message: WSMessage = JSON.parse(event.data);
                onMessageRef.current?.(message);
            } catch (err) {
                console.error('Failed to parse WS message:', err);
            }
        };

        ws.onclose = () => {
            console.log('WebSocket disconnected');
            setIsConnected(false);
            wsRef.current = null;

            if (reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
                const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
                reconnectTimeoutRef.current = setTimeout(() => {
                    reconnectAttempts.current++;
                    connectFnRef.current?.();
                }, delay);
            }
        };

        ws.onerror = (err) => {
            console.error('WebSocket error:', err);
        };
    }, [role, tableId, sessionId]);

    useEffect(() => {
        connectFnRef.current = doConnect;
    }, [doConnect]);

    const sendMessage = useCallback((message: Omit<WSMessage, 'timestamp'>) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ ...message, timestamp: Date.now() }));
        }
    }, []);

    const disconnect = useCallback(() => {
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
        }
        reconnectAttempts.current = MAX_RECONNECT_ATTEMPTS;
        wsRef.current?.close();
    }, []);

    useEffect(() => {
        if (autoConnect) {
            doConnect();
        }
        return () => {
            disconnect();
        };
    }, [autoConnect, doConnect, disconnect]);

    return { isConnected, sendMessage, disconnect, connect: doConnect };
}
