'use client';

import React, { useState, useEffect, useMemo } from 'react';
import NotificationIcon from '@mui/icons-material/Notifications';
import { Timeline, TimelineItem, TimelineSeparator, TimelineDot, TimelineConnector, TimelineContent, TimelineOppositeContent } from '@mui/lab';
import { IconButton, Menu, MenuItem, Dialog, DialogTitle, DialogContent, Typography, Avatar, Grid, Switch, FormControlLabel, Chip, Card, Box, Badge } from '@mui/material';

type NotificationType = 'birthday' | 'anniversary';

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
	const [openDialog, setOpenDialog] = useState(false);
	const [getData, setData] = useState<FamilyDatum[]>([]);
	const [timelineOpen, setTimelineOpen] = useState(false);
	const [showNext7Days, setShowNext7Days] = useState(false);
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
					events.push({ type: 'birthday', ids: [person.id], label: `🎂 ${getFullName(data)}'s Birthday`, date: bDate, people: [person], diff, extra: `Turning ${age}` });
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
					const label = name1 === name2 ? `💍 ${name1}'s Anniversary` : `💍 ${name1} & ${name2}`;

					events.push({ type: 'anniversary', ids: [person.id, spouseId], label, date: mDate, people: [person, spouse], diff, extra: `${years} years` });
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

	return (
		<>
			{/* <IconButton color="inherit" onClick={openMenu}> <NotificationIcon sx={{ fontSize: { xs: 18, sm: 22, md: 28 } }} /> </IconButton> */}
			<IconButton color="inherit" onClick={openMenu}>
				<Badge badgeContent={ notifications.filter(n => n.diff === 0).length } color="error" overlap="circular">
					<NotificationIcon sx={{ fontSize: { xs: 18, sm: 22, md: 28 } }} />
				</Badge>
			</IconButton>

			<Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={closeMenu}>
				<FormControlLabel control={ <Switch checked={showNext7Days} onChange={() => setShowNext7Days(p => !p)} size="small" /> } label="Next 7 Days" sx={{ pl: 2 }} />

				{ notifications.length === 0 && <MenuItem disabled> No notifications </MenuItem> }

				{ notifications.map((n, i) => <MenuItem key={i} onClick={() => { openDetails(n); closeMenu(); }}> {n.label} <Chip label={getChipLabel(n.diff)} size="small" sx={{ ml: 1, backgroundColor: n.diff === 0 ? n.type === 'birthday' ? '#1976d2' : '#9c27b0' : undefined, color: n.diff === 0 ? 'white' : undefined }} /> </MenuItem> ) }

				<MenuItem onClick={() => { setTimelineOpen(true); closeMenu(); }}> 📅 View Timeline </MenuItem>
			</Menu>

			{/* Dialog for details */}
			<Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="lg">
				<DialogTitle>
					{selectedNotification?.type === 'birthday' && `🎂 Birthday - ${selectedNotification.extra}`}
					{selectedNotification?.type === 'anniversary' && `💍 Anniversary - ${selectedNotification.extra}`}
				</DialogTitle>
				<DialogContent dividers>
					<Grid container spacing={2}>
						{selectedPeople.map((person, i) => (
							<Grid size={{ xs: 12, sm: selectedPeople.length > 1 ? 6 : 12 }} key={i}>
								<Card sx={{ p: 2 }}>
									<Grid container direction="column" alignItems="center" spacing={1}>
										<Grid>
											<Avatar src={person.data.avatar as string} sx={{ width: 200, height: 200, mb: 2, borderRadius: 2 }} />
										</Grid>
										<Grid>
											<Typography variant="h6">{getFullName(person.data)}</Typography>
											<Typography variant="body2">Birthdate: {person.data['DOB']}</Typography>
											<Typography variant="body2">Occupation: {person.data['occupation']}</Typography>
											<Typography variant="body2">Address: {person.data['address']}</Typography>
											<Typography variant="body2">Phone: {person.data['phone']}</Typography>
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
					<Timeline position="alternate">
						{
							notifications.map((n, i) =>
								<TimelineItem key={i}>
									<TimelineOppositeContent color="text.secondary"> {n.date} </TimelineOppositeContent>
									<TimelineSeparator>
										<TimelineDot color={n.type === 'birthday' ? 'primary' : 'secondary'} sx={{ p: 0.5 }}>
											{ n.type === 'birthday' && <Avatar src={n.people[0]?.data.avatar as string} sx={{ width: 40, height: 40 }} /> }

											{
												n.type === 'anniversary' &&
													<Box sx={{ position: 'relative', width: 48, height: 40 }}>
														<Avatar src={n.people[0]?.data.avatar as string} sx={{ width: 32, height: 32, position: 'absolute', left: 0, zIndex: 2, border: '2px solid white' }} />
														<Avatar src={n.people[1]?.data.avatar as string} sx={{ width: 32, height: 32, position: 'absolute', right: 0, zIndex: 1, border: '2px solid white' }} />
													</Box>
											}
										</TimelineDot>
										{ i < notifications.length - 1 && <TimelineConnector /> }
									</TimelineSeparator>
									<TimelineContent sx={{ cursor: 'pointer', backgroundColor: n.diff === 0 ? n.type === 'birthday' ? 'rgba(25, 118, 210, 0.1)' : 'rgba(156, 39, 176, 0.1)' : 'transparent', borderRadius: 2, p: 1 }} onClick={() => openDetails({ people: n.people, type: n.type, extra: n.extra })}>
										<Typography variant="subtitle1">{n.label}</Typography>
										<Chip label={`${getChipLabel(n.diff)} - ${((n.extra).split(' ')[0] + ' ' + (Number((n.extra).split(' ')[1]) + 1).toString()).toString().replace('NaN', ' Year/s')}`} size="small" sx={{ mt: 0.5 }} />
									</TimelineContent>
								</TimelineItem>
							)
						}
					</Timeline>
				</DialogContent>
			</Dialog>
		</>
	);
};
