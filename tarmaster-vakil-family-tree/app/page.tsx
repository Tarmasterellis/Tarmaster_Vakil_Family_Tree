'use client';

import Box from '@mui/material/Box';
import { motion } from 'framer-motion';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import { useSession } from "next-auth/react";
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import React, { useState, useEffect } from 'react';
import Diversity1Icon from '@mui/icons-material/Diversity1';


export default function DashboardPage() {

	const key: string = 'color-mode';
	const { data: session } = useSession();
	const [mode, setMode] = useState<string | null>(null);

	useEffect(() => {
		// Check if we're in the browser
		if (typeof window === 'undefined') return;

		const updateValue = () => {
			const currentValue = localStorage.getItem(key);
			setMode(currentValue);
		};

		updateValue(); // Initial read

		// Listen for cross-tab updates
		const handleStorage = (e: StorageEvent) => {
			if (e.key === key) updateValue();
		};
		window.addEventListener('storage', handleStorage);

		// Optional: Poll for same-tab updates
		const interval = setInterval(updateValue, 500);

		return () => {
			window.removeEventListener('storage', handleStorage);
			clearInterval(interval);
		};
	}, [key]);

	return (
		<Box sx={{ minHeight: '92vh', display: 'flex', alignItems: 'center', bgcolor: 'background.default', backgroundImage: 'url(/Assets/bg-tree.svg)', backgroundRepeat: 'no-repeat', backgroundPositionX: 'right', backgroundPositionY: 'bottom' }}>
			<Container maxWidth="md">
				<Stack spacing={5} direction={{ xs: 'column', md: 'row' }} alignItems="center" justifyContent="space-between">
					<Stack spacing={3} textAlign={{ xs: 'center' }} flex={1}>
						<motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
							<Diversity1Icon color={ "inherit" } sx={{ fontSize: 64 }} />
							<Typography variant="h2" color={ mode === 'dark' ? '#FFFFFF' : '#2D333A' }> {`Welcome to`} </Typography>
							<Typography variant="h2" color={ mode === 'dark' ? '#FFFFFF' : '#2D333A' }> {`Tarmaster - Vakil Family Tree`} </Typography>
						</motion.div>
						<motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }}>
							<Typography variant="h6" color="text.secondary"> Discover your roots, connect with generations, and preserve your family&apos;s legacy. Your digital home for exploring the Tarmaster - Vakil family history. </Typography>
						</motion.div>
						{/* Remove this in Production */}
						<motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.6 }} hidden={ session?.user ? false : true }>
							<Button variant="contained" color="primary" size="large" onClick={() => window.location.href = '/dashboard'}> Go to Dashboard </Button>
						</motion.div>
					</Stack>
				</Stack>
			</Container>
		</Box>			
	);
}