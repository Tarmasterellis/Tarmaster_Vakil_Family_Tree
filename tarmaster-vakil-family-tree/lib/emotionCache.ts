// lib/emotionCache.ts
'use client';

import createCache from '@emotion/cache';

export const emotionCache = createCache({ key: 'css', prepend: true });
