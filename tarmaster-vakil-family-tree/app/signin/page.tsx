"use client";

import { signIn } from "next-auth/react";
import GoogleIcon from "@mui/icons-material/Google";
import { Button, Typography, Box } from "@mui/material";

export default function SignInPage() {
	return (
		<Box textAlign="center" mt={10}>
			<Typography variant="h4" mb={4}>Sign In</Typography>
			<Button variant="contained" startIcon={<GoogleIcon />} onClick={() => signIn("google")}> Sign in with Google </Button>
		</Box>
	);
}
