'use client';

import Image from 'next/image';
import Chip from '@mui/material/Chip';
import Card from '@mui/material/Card';
import Menu from '@mui/material/Menu';
import Grid from '@mui/material/Grid';
import Badge from '@mui/material/Badge';
import Timeline from '@mui/lab/Timeline';
import Switch from '@mui/material/Switch';
import Dialog from '@mui/material/Dialog';
import Avatar from '@mui/material/Avatar';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import TimelineDot from '@mui/lab/TimelineDot';
import CardMedia from '@mui/material/CardMedia';
import TimelineItem from '@mui/lab/TimelineItem';
import { useTheme } from '@mui/material/styles';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import DialogTitle from '@mui/material/DialogTitle';
import ListItemIcon from '@mui/material/ListItemIcon';
import TimelineContent from '@mui/lab/TimelineContent';
import DialogContent from '@mui/material/DialogContent';
import ListSubheader from '@mui/material/ListSubheader';
import useMediaQuery from '@mui/material/useMediaQuery';
import TimelineConnector from '@mui/lab/TimelineConnector';
import TimelineSeparator from '@mui/lab/TimelineSeparator';
import React, { useState, useEffect, useMemo } from 'react';
import CakeRoundedIcon from '@mui/icons-material/CakeRounded';
import FormControlLabel from '@mui/material/FormControlLabel';
import ErrorIconRounded from '@mui/icons-material/ErrorRounded';
import NotificationIcon from '@mui/icons-material/Notifications';
import TimelineRoundedIcon from '@mui/icons-material/TimelineRounded';
import FavoriteRoundedIcon from '@mui/icons-material/FavoriteRounded';
import TimelineOppositeContent from '@mui/lab/TimelineOppositeContent';
import FireplaceRoundedIcon from '@mui/icons-material/FireplaceRounded';

type NotificationType = 'birthday' | 'anniversary' | 'death';

type FamilyDatum = { id: string; rels: { father?: string; mother?: string; spouses?: string[]; children?: string[]; }; data: Record<string, string | number>; };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getFullName = (data: Record<string, any>) => `${data['first name'] || ''} ${data['last name'] || ''}`.trim();

const formatDate = (y: string, m: string, d: string) => `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;

const getDaysDiff = (dateStr: string) => {
	const target = new Date(dateStr);
	const today = new Date();
	const diff = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
	return diff;
};

const getChipLabel = (diff: number) => { return diff === 0 ? 'Today' : diff === 1 ? 'Tomorrow' : `In ${diff} days`; };

export const Notifications = () => {
	const theme = useTheme();
	const [openDialog, setOpenDialog] = useState(false);
	const [getData, setData] = useState<FamilyDatum[]>([]);
	const [timelineOpen, setTimelineOpen] = useState(false);
	const [showNext7Days, setShowNext7Days] = useState(false);
	const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
	const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
	const [selectedPeople, setSelectedPeople] = useState<FamilyDatum[]>([]);
	const [selectedNotification, setSelectedNotification] = useState<{ type: NotificationType; extra: string; } | null>(null);

	const fetchData = async () => {
		try
		{
			const res = await fetch('/api/family-nodes');
			const data = await res.json();
			setData(data);
		}
		catch (err) { console.error('Failed to load initial data:', err); }
	};

	useEffect(() => { fetchData(); }, []);

	const today = useMemo(() => new Date(), []);

	const notifications = useMemo(() => {
		const events: { type: NotificationType; ids: string[]; label: string; date: string; people: FamilyDatum[]; diff: number; extra: string; }[] = [];

		const seenAnniv = new Set<string>();

		getData.forEach((person) => {
			const { data, rels } = person;

			// --- BIRTHDAY ---
			if (data['birth date'] && data['birth month'] && data['birth year']) {
				const baseYear = today.getFullYear();
				let bDate = formatDate(baseYear.toString(), data['birth month'] as string, data['birth date'] as string);
				let diff = getDaysDiff(bDate);

				// If birthday already passed, move to next year
				if (diff < 0)
				{
					bDate = formatDate((baseYear + 1).toString(), data['birth month'] as string, data['birth date'] as string);
					diff = getDaysDiff(bDate);
				}

				if (!showNext7Days || (diff >= 0 && diff <= 7))
				{
					const age = (baseYear + (diff < 0 ? 1 : 0)) - parseInt(data['birth year'] as string);
					events.push({ type: 'birthday', ids: [person.id], label: `${getFullName(data)}'s Birthday`, date: bDate, people: [person], diff, extra: `Turning ${age}` });
				}
			}

			// --- ANNIVERSARY ---
			if (data['marriage date'] && data['marriage month'] && data['marriage year'] && Array.isArray(rels.spouses) && rels.spouses.length > 0)
			{
				const spouseId = rels.spouses[0];

				// Avoid self-marriage or missing spouse
				if (!spouseId || spouseId === person.id) return;

				const key = [person.id, spouseId].sort().join('-');
				if (seenAnniv.has(key)) return;
				seenAnniv.add(key);

				const spouse = getData.find(p => p.id === spouseId);
				if (!spouse) return;

				const baseYear = today.getFullYear();
				let mDate = formatDate(baseYear.toString(), data['marriage month'] as string, data['marriage date'] as string);
				let diff = getDaysDiff(mDate);

				// If anniversary passed, move to next year
				if (diff < 0)
				{
					mDate = formatDate((baseYear + 1).toString(), data['marriage month'] as string, data['marriage date'] as string);
					diff = getDaysDiff(mDate);
				}

				if (!showNext7Days || (diff >= 0 && diff <= 7))
				{
					const years = (baseYear + (diff < 0 ? 1 : 0)) - parseInt(data['marriage year'] as string);
					const name1 = getFullName(data);
					const name2 = getFullName(spouse.data);

					// Avoid showing same name twice
					const label = name1 === name2 ? `${name1}'s Anniversary` : `${name1} & ${name2}`;

					events.push({ type: 'anniversary', ids: [person.id, spouseId], label, date: mDate, people: [person, spouse], diff, extra: `${years} years` });
				}
			}

			// --- DEATH ANNIVERSARY ---
			if (data['death date'] && data['death month'] && data['death year']) {
				const baseYear = today.getFullYear();
				let dDate = formatDate(baseYear.toString(), data['death month'] as string, data['death date'] as string);
				let diff = getDaysDiff(dDate);

				// If already passed this year, calculate for next year
				if (diff < 0)
				{
					dDate = formatDate((baseYear + 1).toString(), data['death month'] as string, data['death date'] as string);
					diff = getDaysDiff(dDate);
				}

				if (!showNext7Days || (diff >= 0 && diff <= 7))
				{
					const years = (baseYear + (diff < 0 ? 1 : 0)) - parseInt(data['death year'] as string);
					events.push({ type: 'death', ids: [person.id], label: `${getFullName(data)}'s Death Anniversary`, date: dDate, people: [person], diff, extra: `${years} years` });
				}
			}
		});

		return events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
	}, [getData, showNext7Days, today]);

	const openMenu = (e: React.MouseEvent<HTMLButtonElement>) => setAnchorEl(e.currentTarget);
	const closeMenu = () => setAnchorEl(null);

	const openDetails = (notification: { people: FamilyDatum[]; type: NotificationType; extra: string }) => {
		setSelectedPeople(notification.people);
		setSelectedNotification({ type: notification.type, extra: notification.extra });
		setOpenDialog(true);
	};

	const renderNotificationItems = (type: 'birthday' | 'anniversary' | 'death', label: string, icon: React.ReactNode) => {
		const filtered = notifications.filter(n => n.type === type);
		if (!filtered.length) return null;

		return (
			<div>
				<ListSubheader>{label}</ListSubheader>
				{
					filtered.map((n, i) =>
						<MenuItem className={`flex w-full items-center justify-start gap-3`} key={i} onClick={() => { openDetails(n); closeMenu(); }}>
							<ListItemIcon>{icon}</ListItemIcon>
							<div className={`gap-2`}>  
								{n.label}
								<Chip label={getChipLabel(n.diff)} size="small" sx={{ ml: 1, backgroundColor: n.diff === 0 ? '#1976d2' : undefined, color: n.diff === 0 ? 'white' : undefined }} />
							</div>
						</MenuItem>
					)
				}
			</div>
		);
	};

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const renderCard = (n: any, i: any) => {
		return n.type === 'birthday'
		?
			i % 2 === 0
			?
				<Card sx={{ maxWidth: 350, height: 150, p: 0, display: 'flex', alignItems: 'stretch', bgcolor: '#e8f5e9', color: '#1b5e20' }}>
		 			<CardContent sx={{ flex: '1 0 auto' }}>
						<Chip label={`Date: ${n.people[0]['data']['DOB']}`} size="small" sx={{ mt: 0.5, bgcolor: '#43a047', color: '#fff' }} />
		 				<Typography component="div" variant="subtitle1">{n.label}</Typography>
		 				<Chip label={`${getChipLabel(n.diff)} - ${ ((n.extra).split(' ')[0] + ' ' + (Number((n.extra).split(' ')[1]) + 1)).replace('NaN', ' Years') }`} size="small" sx={{ mt: 0.5, bgcolor: '#43a047', color: '#fff' }} />
		 			</CardContent>
		 			<CardMedia component="img" sx={{ width: 151 }} image={n.people[0]?.data.avatar as string} alt={n.label} />
		 		</Card>
			:
				<Card sx={{ maxWidth: 350, height: 150, p: 0, display: 'flex', alignItems: 'stretch', bgcolor: '#e8f5e9', color: '#1b5e20' }}>
					<CardMedia component="img" sx={{ width: 151 }} image={n.people[0]?.data.avatar as string} alt={n.label} />
					<CardContent sx={{ flex: '1 1' }}>
						<Chip label={`Date: ${n.people[0]['data']['DOB']}`} size="small" sx={{ mt: 0.5, bgcolor: '#43a047', color: '#fff' }} />
						<Typography component="div" variant="subtitle1">{n.label}</Typography>
						<Chip label={`${getChipLabel(n.diff)} - ${ ((n.extra).split(' ')[0] + ' ' + (Number((n.extra).split(' ')[1]) + 1)).replace('NaN', ' Years') }`} size="small" sx={{ mt: 0.5, bgcolor: '#43a047', color: '#fff' }} />
					</CardContent>
				</Card>
		:
			n.type === 'anniversary'
			?
				<Card sx={{ maxWidth: 350, height: 150, p: 0, display: 'flex', alignItems: 'stretch', bgcolor: '#FFF3e0', color: '#6D4C41' }}>
		 			<div style={{ position: 'relative', width: '200px', height: '100%' }}>
		 				<Image src={n.people[0]?.data.avatar as string} sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" alt="Left" fill style={{ objectFit: 'cover' }} />
		 			</div>
		 			<CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
		 				<Chip label={`Date: ${n.people[0]['data']['Marriage']}`} size="small" sx={{ mt: 0.5, bgcolor: '#f06292', color: '#fff' }} />
		 				<Typography variant="subtitle1">{n.label.split('&')[0]}</Typography>
		 				{" & "}
		 				<Typography variant="subtitle1">{n.label.split('&')[1]}</Typography>
		 				<Chip label={`${getChipLabel(n.diff)} - ${ ((n.extra).split(' ')[0] + ' ' + (Number((n.extra).split(' ')[1]) + 1)).replace('NaN', ' Years') }`} size="small" sx={{ mt: 0.5, bgcolor: '#f06292', color: '#fff' }} />
		 			</CardContent>
		 			<div style={{ position: 'relative', width: '200px', height: '100%' }}>
		 				<Image src={n.people[1]?.data.avatar as string} sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" alt="Right" fill style={{ objectFit: 'cover' }} />
		 			</div>
		 		</Card>
			:
				n.type === 'death'
				?
					<Card sx={{ maxWidth: 350, height: 150, p: 0, display: 'flex', alignItems: 'stretch', bgcolor: '#fce4ec', color: '#880e4f' }}>
						<CardMedia component="img" sx={{ width: 151 }} image={n.people[0]?.data.avatar as string} alt={n.label} />
						<CardContent sx={{ flex: '1 0 auto' }}>
							<Chip label={`Date: ${n.people[0]['data']['DOD']}`} size="small" sx={{ mt: 0.5, bgcolor: '#ad1457', color: '#fff' }} />
							<Typography component="div" variant="caption" fontWeight="bold">{n.label.split(' ')[0] + ' ' + n.label.split(' ')[1]}</Typography>
							<Typography component="div" variant="caption" fontWeight="bold">{n.label.split(' ')[2] + ' ' + n.label.split(' ')[3]}</Typography>
							<Chip label={`${getChipLabel(n.diff)} - ${ ((n.extra).split(' ')[0] + ' ' + (Number((n.extra).split(' ')[1]) + 1)).replace('NaN', ' Years') }`} size="small" sx={{ mt: 0.5, bgcolor: '#ad1457', color: '#fff' }} />
						</CardContent>
					</Card>
				:
					null;
	};


	return (
		<div>
			<IconButton color="inherit" onClick={openMenu}>
				<Badge badgeContent={ notifications.filter(n => n.diff === 0).length } color="error" overlap="circular">
					<NotificationIcon sx={{ fontSize: { xs: 18, sm: 22, md: 28 } }} />
				</Badge>
			</IconButton>

			<Menu className="hide-scrollbar" anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={closeMenu} slotProps={{ paper: { style: { maxHeight: '50vh', overflowY: 'auto', scrollbarWidth: 'none', msOverflowStyle: 'none' } } }}>
				<ListSubheader>Filters</ListSubheader>
				<FormControlLabel className={`p-3`} control={ <Switch checked={showNext7Days} onChange={() => setShowNext7Days(prev => !prev)} size="small" /> } label="Filter for Only Next 7 Days" sx={{ pl: 2 }} />

				{ notifications.length === 0 && <MenuItem disabled>No notifications</MenuItem> }

				<ListSubheader>View in Timeline</ListSubheader>
				<MenuItem onClick={() => { setTimelineOpen(true); closeMenu(); }}>
					<div className={`flex w-full items-center justify-start gap-3`}>
						<TimelineRoundedIcon fontSize="medium" />
						<p>Timeline</p>
					</div>
				</MenuItem>

				{ renderNotificationItems('birthday', 'Birthdays', <Avatar sx={{ bgcolor: '#e8f5e9', color: '#1b5e20' }}><CakeRoundedIcon fontSize="medium" /></Avatar>) }
				{ renderNotificationItems('anniversary', 'Anniversaries', <Avatar sx={{ bgcolor: '#FFF3e0', color: '#6D4C41' }}><FavoriteRoundedIcon fontSize="medium" /></Avatar>) }
				{ renderNotificationItems('death', 'Death Anniversaries', <Avatar sx={{ bgcolor: '#fce4ec', color: '#880e4f' }}><FireplaceRoundedIcon fontSize="medium" /></Avatar>) }

			</Menu>

			{/* Dialog for details */}
			<Dialog className={`!m-0 !p-0`} open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="lg" fullScreen={isMobile}>
				<DialogTitle className={`flex items-center justify-center gap-2 bg-white`} sx={{ backgroundColor: selectedNotification?.type === 'birthday' ? '#e8f5e9' : selectedNotification?.type === 'anniversary' ? '#FFF3e0' : selectedNotification?.type === 'death' ? '#fce4ec' : '' }}>
					{selectedNotification?.type === 'birthday' && <div className="flex items-center gap-2 text-[#1b5e20]"> <CakeRoundedIcon fontSize='large' />  Birthday - {selectedNotification.extra} </div>}
					{selectedNotification?.type === 'anniversary' && <div className="flex items-center gap-2 text-[#6D4C41]"> <FavoriteRoundedIcon fontSize='large' /> Anniversary - {selectedNotification.extra} </div> }
					{selectedNotification?.type === 'death' && <div className="flex items-center gap-2 text-[#b6306a]"> <FireplaceRoundedIcon fontSize='large' /> Death Anniversary - {selectedNotification.extra} </div>}
				</DialogTitle>
				<Divider />
				<DialogContent dividers sx={{ bgcolor: selectedNotification?.type === 'birthday' ? '#e8f5e9' : selectedNotification?.type === 'anniversary' ? '#FFF3e0' : selectedNotification?.type === 'death' ? '#fce4ec' : '' }}>
					<Grid container spacing={2}>
						{selectedPeople.map((person, i) => (
							<Grid direction={isMobile ? 'column' : 'row'} size={{ xs: 12, sm: selectedPeople.length > 1 ? 6 : 12 }} key={i}>
								<Card sx={{ p: 2, color: selectedNotification?.type === 'birthday' ? '#e8f5e9' : selectedNotification?.type === 'anniversary' ? '#FFF3e0' : selectedNotification?.type === 'death' ? '#fce4ec' : '', backgroundColor: selectedNotification?.type === 'birthday' ? '#1b5e20' : selectedNotification?.type === 'anniversary' ? '#6D4C41' : selectedNotification?.type === 'death' ? '#880e4f' : '' }}>
									<Grid direction={isMobile ? 'row' : 'row'} container alignItems="center" spacing={1}>
										<Avatar src={person.data.avatar as string} sx={{  width: isMobile ? '40vw' : '15vw', height: isMobile ? '40vw' : '32vh', borderRadius: '50%', }} />
										<Grid container direction={'column'} gap={2}>
											<Typography variant={'h5'}>{getFullName(person.data)}</Typography>
											<Typography variant={'body2'}>Birthdate: {person.data['DOB']}</Typography>
											{ person.data['occupation'] !== '' && <Typography variant={'caption'}>Occupation: {person.data['occupation']}</Typography> }
											<Typography variant={'body2'}>Address: {person.data['address']}</Typography>
											{ person.data['phone'] !== '' && <Typography variant={'body2'}>Phone: {person.data['phone']}</Typography> }
											{ person.data['Marriage'] !== '💍 N/A' && <Typography variant={'body2'}>Marriage: {person.data['Marriage']}</Typography> }
											{ person.data['DOD'] !== '🪦 N/A' && <Typography variant={'body2'}>Death: {person.data['DOD']}</Typography> }
										</Grid>
									</Grid>
								</Card>
							</Grid>
						))}
					</Grid>
				</DialogContent>
			</Dialog>

			{/* Timeline */}
			<Dialog open={timelineOpen} onClose={() => setTimelineOpen(false)} maxWidth="md" fullWidth>
				<DialogTitle>📅 Upcoming Events Timeline</DialogTitle>
				<DialogContent dividers>
					<Timeline position={ isMobile ? 'right' : undefined }>
						{
							notifications.map((n, i) =>
								<TimelineItem key={i}>
									{
										isMobile
										?
											null
										:
											<TimelineOppositeContent color="text.secondary" sx={{ ...(isMobile ? {} : (i % 2 === 0 ? {position: 'relative', right: '52%' } : {})) }}>
												{ renderCard(n, i) }
											</TimelineOppositeContent>
									}

									<TimelineSeparator>
										{
											n.type === 'birthday'
											?
												<TimelineDot color={'primary'} style={{ backgroundColor: '#43a047', color: 'white' }}>
													<CakeRoundedIcon fontSize="medium" />
												</TimelineDot>
											:
												n.type === 'anniversary'
												?
													<TimelineDot color={'primary'} style={{ backgroundColor: '#f06292', color: 'white' }}>
														<FavoriteRoundedIcon fontSize="medium" />
													</TimelineDot>
												:
													n.type === 'death'
													?
														<TimelineDot color={'primary'} style={{ backgroundColor: '#ad1457', color: 'white' }}>
															<FireplaceRoundedIcon fontSize="medium" />
														</TimelineDot>
													:
														<TimelineDot color={'primary'}>
															<ErrorIconRounded fontSize="medium" />
														</TimelineDot>
										}
										{ i < notifications.length - 1 && <TimelineConnector className="h-[5vh]" /> }
									</TimelineSeparator>

									<TimelineContent sx={{ cursor: 'pointer',  backgroundColor: n.diff === 0 ? n.type === 'birthday' ? 'rgba(25, 118, 210, 0.1)' : 'rgba(156, 39, 176, 0.1)' : 'transparent', borderRadius: 2, ...(isMobile ? {} : (i % 2 === 1 ? {position: 'relative', right: '52%' } : {})) }} onClick={() => openDetails({ people: n.people, type: n.type, extra: n.extra })}>
										{ renderCard(n, i) }
									</TimelineContent>
								</TimelineItem>
							)
						}
					</Timeline>
				</DialogContent>
			</Dialog>
		</div>
	);
};
