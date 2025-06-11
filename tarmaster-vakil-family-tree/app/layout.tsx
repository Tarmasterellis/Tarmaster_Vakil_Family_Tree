'use client';

import "./globals.css";
import { Appbar } from "@/app/components/Appbar";
import Providers from "@/app/providers/providers";
import React, { ReactNode, useState, useEffect, useMemo } from 'react';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';


export default function RootLayout({ children }: { children: ReactNode }) {

	const [mode, setMode] = useState<'light' | 'dark'>('light');

	useEffect(() => {
		const storedMode = localStorage.getItem('color-mode') as 'light' | 'dark';
		if (storedMode) setMode(storedMode);
	}, []);

	

	const theme = useMemo( () => createTheme({ palette: { mode, primary: { main: '#FFFFFF' }, secondary: { main: '#2D333A' }, background: { default: mode === 'light' ? '#FFFFFF' : '#2D333A', paper: mode === 'light' ? '#FFFFFF' : '#2D333A' }}}), [mode]);

	return (
		<html lang="en">
			<body>
				<ThemeProvider theme={theme}>
					<CssBaseline />
					<Providers>
						<Appbar mode={mode} setMode={setMode} />
						{children}
					</Providers>
				</ThemeProvider>
			</body>
		</html>
	);
}
