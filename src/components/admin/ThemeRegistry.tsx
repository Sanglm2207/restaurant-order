'use client';

import { ReactNode, useState } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { CacheProvider } from '@emotion/react';
import createCache from '@emotion/cache';
import { useServerInsertedHTML } from 'next/navigation';
import theme from './theme';

function createEmotionCache() {
    return createCache({ key: 'mui', prepend: true });
}

export default function ThemeRegistry({ children }: { children: ReactNode }) {
    const [cache] = useState(() => createEmotionCache());

    useServerInsertedHTML(() => {
        const names = Object.keys(cache.inserted);
        if (names.length === 0) return null;
        let styles = '';
        for (const name of names) {
            const val = cache.inserted[name];
            if (typeof val === 'string') styles += val;
        }
        return (
            <style
                key={cache.key}
                data-emotion={`${cache.key} ${names.join(' ')}`}
                dangerouslySetInnerHTML={{ __html: styles }}
            />
        );
    });

    return (
        <CacheProvider value={cache}>
            <ThemeProvider theme={theme}>
                <CssBaseline />
                {children}
            </ThemeProvider>
        </CacheProvider>
    );
}
