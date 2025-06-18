'use client';

import AppBar from '@mui/material/AppBar';
import Avatar from '@mui/material/Avatar';
import Tooltip from '@mui/material/Tooltip';
import { useSession } from "next-auth/react";
import { signIn, signOut } from "next-auth/react";
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import GoogleIcon from '@mui/icons-material/Google';
import { Notifications } from "@/app/components/Notifications";
import FamilyRestroomIcon from '@mui/icons-material/FamilyRestroom';
import DarkModeRoundedIcon from '@mui/icons-material/DarkModeRounded';
import LightModeRoundedIcon from '@mui/icons-material/LightModeRounded';


export const Appbar = ({ mode, setMode }: { mode: string, setMode: React.Dispatch<React.SetStateAction<"light" | "dark">> }) => {

	const toggleColorMode = () => {
		const newMode = mode === 'light' ? 'dark' : 'light';
		setMode(newMode);
		localStorage.setItem('color-mode', newMode);
	};

	const { data: session } = useSession();

	const handleSigninOut = () => {
		if(session?.user) { signOut({ callbackUrl: "/" }); }
		else { signIn("google", { callbackUrl: "/dashboard" }); }
	}

	return (
		<AppBar position="static" color={ mode === "dark" ? "primary" : "secondary" } elevation={2} sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
			<div className={`flex justify-between items-center min-h-16`}>
				<div className={`flex pl-10 items-center justify-between gap-2`}>
					<FamilyRestroomIcon sx={{ mr: { xs: 0.5, sm: 1, md: 2 }, fontSize: { xs: 20, sm: 28, md: 36 } }} />
					<Typography variant="h6" component="div" sx={{ flexGrow: 1, fontSize: { xs: '0.875rem', sm: '1rem', md: '1.5rem' } }}> {`Tarmaster - Vakil Family Tree`}</Typography>
				</div>
				<div className={`flex pr-10 gap-5 items-center justify-end w-1/2`}>
					<Tooltip sx={{ display: 'flex', pr: { xs: 1 } }} title={mode === "dark" ? "Let There Be Light...!" : "I was Born in Darkness"} placement="bottom" arrow followCursor>
						<IconButton color="inherit" onClick={toggleColorMode}>
							{ mode === 'dark' ? <LightModeRoundedIcon sx={{ fontSize: { xs: 18, sm: 22, md: 28 } }} /> : <DarkModeRoundedIcon sx={{ fontSize: { xs: 18, sm: 22, md: 28 } }} /> }
						</IconButton>
					</Tooltip>
					{
						session?.user?.name &&
						<Tooltip sx={{ display: 'flex', pr: { xs: 1 } }} title={'Notifications...!'} placement="bottom" arrow followCursor>
							<Notifications />
						</Tooltip>
					}
					<Tooltip sx={{ display: 'flex', pr: { xs: 1 } }} title={ session?.user?.name ? `Welcome ${session.user.name}` : "Login / Sign-up With Google" } placement="bottom" arrow followCursor>
						<IconButton color="inherit" onClick={handleSigninOut}>
							{ session?.user ? <Avatar alt={session.user.name!} src={session.user.image ?? undefined} sx={{ width: { xs: 24, sm: 32, md: 40 }, height: { xs: 24, sm: 32, md: 40 } }} /> : <GoogleIcon sx={{ fontSize: { xs: 18, sm: 24, md: 28 } }} /> }
						</IconButton>
					</Tooltip>
				</div>
			</div>
		</AppBar>
	);
}
