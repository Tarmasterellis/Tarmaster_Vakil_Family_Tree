'use client';

import f3 from 'family-chart';
import Card from '@mui/material/Card';
import Masonry from '@mui/lab/Masonry';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Avatar from '@mui/material/Avatar';
import { useSession } from "next-auth/react";
import 'family-chart/styles/family-chart.css';
import Snackbar from '@mui/material/Snackbar';
import { useTheme } from '@mui/material/styles';
import Accordion from '@mui/material/Accordion';
import CardMedia from '@mui/material/CardMedia';
import SpeedDial from '@mui/material/SpeedDial';
import SaveIcon from '@mui/icons-material/Save';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import CardContent from '@mui/material/CardContent';
import SpeedDialIcon from '@mui/material/SpeedDialIcon';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import RefreshIcon from '@mui/icons-material/RestartAlt';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import SpeedDialAction from '@mui/material/SpeedDialAction';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CircularProgress from '@mui/material/CircularProgress';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import UnfoldMoreRoundedIcon from '@mui/icons-material/UnfoldMoreRounded';
import UnfoldLessRoundedIcon from '@mui/icons-material/UnfoldLessRounded';
import { getComprehensiveRelationships } from '@/lib/helper/relationships';
import CloudUploadRoundedIcon from '@mui/icons-material/CloudUploadRounded';
import React, { useCallback, useEffect, useRef, useState, useLayoutEffect } from 'react';


type FamilyDatum = { id: string; rels: { parents?: string[]; father?: string; mother?: string; spouses?: string[]; children?: string[] }; data: Record<string, string | number>; };

export default function FamilyTree() {

	const theme = useTheme();
	const mode = theme.palette.mode;
	const { data: session } = useSession();
	const [getOpen, setOpen] = useState(false);
	const [saving, setSaving] = useState(false);
	const [imageUrl, setImageUrl] = useState('');
	const [uploading, setUploading] = useState(false);
	const contRef = useRef<HTMLDivElement | null>(null);
	const [rootId, setRootId] = useState<string | null>();
	const [getProgenyDepth, setProgenyDepth] = useState(8); //Children
	const [getAncestryDepth, setAncestryDepth] = useState(8); //Parents
	const [allData, setAllData] = useState<FamilyDatum[]>([]);
	const [showSavedToast, setShowSavedToast] = useState(false);
	const [uploadModalOpen, setUploadModalOpen] = useState(false);
	const createChartRef = useRef<(data: FamilyDatum[]) => void>(() => {});
	const chartRef = useRef<ReturnType<typeof f3.createChart> | null>(null);
	const [expanded, setExpanded] = React.useState<string | false>('panel0-content');
	const [generationalMap, setGenerationalMap] = useState<Map<number, FamilyDatum[]>>(new Map());

	// Relationship Integration
	const handleChangeAccordian = (panel: string) => (event: React.SyntheticEvent, isExpanded: boolean) => { setExpanded(isExpanded ? panel : false); };
	// const handlePersonSelect = (id: string) => { setRootId(id); chartRef.current.updateMainId(id); chartRef.current.updateTree({ initial: true }); setOpen(false); };
	const handlePersonSelect = (id: string) => {
		setRootId(id);

		if (!chartRef.current) return;

		chartRef.current.updateMainId(id);

		chartRef.current
			.setProgenyDepth(getProgenyDepth)
			.setAncestryDepth(getAncestryDepth)
			.setShowSiblingsOfMain(true)      // Mini tree siblings visible
			.setSingleParentEmptyCard(false); // Show missing parent placeholder

		chartRef.current.updateTree({ initial: false });

		setOpen(false);
	};

	const userName = session?.user?.name;
	
	useEffect(() => {
		if (!allData.length || !userName) return;

		const userFirstName = userName.split(' ')[0].toLowerCase();
		const match = allData.find(data => data?.data && data.data['first name']?.toString().toLowerCase() === userFirstName);

		setRootId(match?.id || 'cmbt2jp7c0003z30vy8mlq737');
	}, [allData, userName]);

	const saveTreeToDB = useCallback(async () => {
		if (!chartRef.current) return;
		setSaving(true);
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const rawData = chartRef.current.store.getData().map((n: any) => ({ ...n, rels: { parents: n.rels?.father || n.rels?.mother ? [n.rels?.father || undefined, n.rels?.mother || undefined] : [], father: n.rels?.father || undefined, mother: n.rels?.mother || undefined, spouses: Array.isArray(n.rels?.spouses) ? n.rels.spouses : [], children: Array.isArray(n.rels?.children) ? n.rels.children : [] } }));

		try
		{
			const res = await fetch('/api/family-nodes', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(rawData),
			});

			if (res.ok)
			{
				const result = await res.json();
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				if (result.skipped > 0) console.log(`⚠️ ${result.skipped} node(s) were not saved. Only the creator (${result.skippedDetails.map((d: any) => d.owner).join(', ')}) can edit them.`);
				else setShowSavedToast(true);

				window.location.reload();
			}
			else alert('Save failed!');
		}
		catch (err) { alert('Save failed!'); console.error(err); }
		finally { setSaving(false); }
	}, []);

	useEffect(() => {
		createChartRef.current = (data: FamilyDatum[]) => {
			const formatDate = (day?: string, month?: string, year?: string) => { return [day, month, year].filter(Boolean).join('-') || 'N/A'; };
			// put your full createChart logic here
			const processed = data.map(d => {
				const fullName = `${d.data['first name'] || ''} ${d.data['last name'] || ''}`.trim();
				const dob = formatDate(d.data['birth date'].toString(), d.data['birth month'].toString(), d.data['birth year'].toString())
				const marriage = formatDate(d.data['marriage date'].toString(), d.data['marriage month'].toString(), d.data['marriage year'].toString())
				const dod = formatDate(d.data['death date'].toString(), d.data['death month'].toString(), d.data['death year'].toString())
				return {
					...d,
					data: {
						...d.data,
						Name: `👤 ${fullName}`,
						Email: `✉️ ${d.data.email || ''}`,
						Phone: `📞 ${d.data.phone || ''}`,
						DOB: `🎂 ${dob}`,
						Marriage: `💍 ${marriage}`,
						Address: `🏠 ${d.data.address || ''}`,
						DOD: `🪦 ${dod}`,
						Occupation: `💼 ${d.data.occupation || ''}`,
						Relationship: `👪 ${getComprehensiveRelationships(allData, rootId || 'cmbt2jp7c0003z30vy8mlq737', d.id)}`,
					},
				};
			});

			const f3Chart = f3
				.createChart('#FamilyChart', processed)
				.setTransitionTime(1000)
				.setCardXSpacing(600)
				.setCardYSpacing(600)
				.setSingleParentEmptyCard(false)
				.setShowSiblingsOfMain(false)
				.setOrientationVertical()
				.setAncestryDepth(getAncestryDepth)
				.setProgenyDepth(getProgenyDepth)
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				.setSortChildrenFunction((a: any, b: any) => a.data['birth year'] === b.data['birth year'] ? 0 : a.data['birth year'] > b.data['birth year'] ? 1 : -1);

			chartRef.current = f3Chart;

			const f3Card = f3Chart.setCard(f3.CardHtml)
				.setCardDisplay([ ['Name'], ['Phone'], ['Email'], ['DOB'], ['Marriage'], ['Address'], ['DOD'], ['Occupation'] ])
				.setCardDim({ width: 500, height: 300, img_width: 250, img_height: 280 })
				.setMiniTree(true)
				.setStyle('imageRect')
				.setOnHoverPathToMain()
				.setOnCardClick((e: MouseEvent, d: FamilyDatum) => {
					if (!f3EditTree.isAddingRelative()) { f3Card.onCardClickDefault(e, d); }
					else if (f3EditTree.isAddingRelative()) { f3EditTree.open(d); }
					f3EditTree.open(d);
				});

			f3Chart.updateMainId(rootId);

			const f3EditTree = f3Chart.editTree()
				.fixed(true)
				.setFields([ 'first name', 'last name', 'email', 'gender', 'avatar', 'birth date', 'birth month', 'birth year', 'occupation', 'phone', 'address', 'marriage date', 'marriage month', 'marriage year', 'death date', 'death month', 'death year' ])
				.setEditFirst(true);
			
			f3EditTree.setEdit({ onUpdate: () => saveTreeToDB() });

			f3Chart.updateTree({ initial: true });
		};
	}, [saveTreeToDB, rootId, getProgenyDepth, getAncestryDepth]);

	const resetTreeView = () => {
		if (chartRef.current && rootId) {
			chartRef.current.updateMainId(rootId);
			// Update the chart configuration
			chartRef.current.setProgenyDepth(8);
			chartRef.current.setAncestryDepth(8);
			chartRef.current.updateTree({ initial: true });
		}
	};

	const resetTreeViewRoot = () => setGenerationalMap(getGenerationalMap(allData, 'cmbt2jp7c0003z30vy8mlq737'));

	useLayoutEffect(() => {
		if (!contRef.current) return;

		fetch('/api/family-nodes')
			.then(res => res.json() )
			.then(data => { createChartRef.current(data); setAllData(data); console.log(data); } )
			.catch(err => {
				console.error('Failed to load initial data:', err);
				createChartRef.current([{ id: '0', rels: { parents: [],father: undefined, mother: undefined, spouses: [], children: [] }, data: { "first name": "No Name", "last name": "No Surname", "birthday": 0, "avatar": "https://static8.depositphotos.com/1009634/988/v/950/depositphotos_9883921-stock-illustration-no-user-profile-picture.jpg", "gender": "", "email": "", "birth date": "", "birth month": "", "birth year": "", "occupation": "", "phone": "", "address": "", "marriage date": "", "marriage month": "", "marriage year": "", "death date": "", "death month": "", "death year": "" } }]);
			});
	}, []);

	const handleUpload = async (file: File) => {
		setUploading(true);
		const formData = new FormData();
		formData.append('file', file);

		const res = await fetch('/api/upload-photo', { method: 'POST', body: formData });

		const data = await res.json();
		if (res.ok) console.log('Uploaded:', setImageUrl(data.secure_url)); // Save data.secure_url to DB or state
		else console.error('Upload error:', data.error);
		setUploading(false);
	};

	function copyToClipboard(text: string) { navigator.clipboard.writeText(text); }

	const handleChange = (AddSub: string) => {
		if (!chartRef.current) return;

		const delta = AddSub === 'Add' ? 1 : -1;

		const newProgeny = Math.max(0, getProgenyDepth + delta);
		const newAncestry = Math.max(0, getAncestryDepth + delta);

		// Update the local state
		setProgenyDepth(newProgeny);
		setAncestryDepth(newAncestry);

		// Update the chart configuration
		chartRef.current.setProgenyDepth(newProgeny);
		chartRef.current.setAncestryDepth(newAncestry);

		// Redraw the chart
		chartRef.current.updateTree({ initial: true });

	};

	// Relationship Integration
	useEffect(() => {
		if (allData.length && rootId) {
			setGenerationalMap(getGenerationalMap(allData, rootId));
			// Redraw the chart
			chartRef.current.updateTree({ initial: true });
		}
	}, [allData, rootId]);

	// Relationship Integration
	useEffect(() => {
		if (allData.length && rootId && createChartRef.current) {
			createChartRef.current(allData); // Recreate chart with updated relationships
			// Redraw the chart
			chartRef.current.updateTree({ initial: true });
		}
	}, [allData]);

	function getGenerationalMap(data: FamilyDatum[], rootId: string) {
		const idToNode = new Map<string, FamilyDatum>();
		data.forEach(node => idToNode.set(node.id, node));

		const generations = new Map<number, FamilyDatum[]>();
		const visited = new Set<string>();

		const queue: { id: string; level: number }[] = [{ id: rootId, level: 0 }];

		while (queue.length) {
			const { id, level } = queue.shift()!;
			const node = idToNode.get(id);
			if (!node) continue;

			const uniqueKey = `${id}-${level}`;
			if (visited.has(uniqueKey)) continue;
			visited.add(uniqueKey);

			if (!generations.has(level)) generations.set(level, []);
			generations.get(level)!.push(node);

			// Parents (level - 1)
			if (node.rels.father) queue.push({ id: node.rels.father, level: level - 1 });
			if (node.rels.mother) queue.push({ id: node.rels.mother, level: level - 1 });

			// Children (level + 1)
			(node.rels.children || []).forEach(childId => {
				queue.push({ id: childId, level: level + 1 });
			});

			// Spouses (same level)
			(node.rels.spouses || []).forEach(spouseId => {
				queue.push({ id: spouseId, level });
			});

			// Siblings (same level)
			const father = node.rels.father;
			const mother = node.rels.mother;

			// Collect siblings by checking father's or mother's children
			if (father || mother) {
				const siblingParent = idToNode.get(father as string || mother as string);
				if (siblingParent) {
					const siblingIds = siblingParent.rels.children || [];
					siblingIds.forEach(siblingId => {
						if (siblingId !== id) {
							queue.push({ id: siblingId, level });
						}
					});
				}
			}
		}

		return generations;
	}

	return (
		<>
			<div className="f3 f3-cont" id="FamilyChart" ref={contRef}></div>

			<SpeedDial ariaLabel="SpeedDial basic example" sx={{ position: 'absolute', bottom: 16, right: 16 }} icon={<SpeedDialIcon />} title="Family Tree Actions">
				<SpeedDialAction onClick={saveTreeToDB} icon={<SaveIcon />} tooltipTitle={`Save family tree to database`} />
				<SpeedDialAction onClick={() => setUploadModalOpen(true)} icon={<CloudUploadRoundedIcon />} tooltipTitle={`Upload an avatar image`} />
				<SpeedDialAction onClick={resetTreeView} icon={<RefreshIcon />} tooltipTitle={`Reset view to root person`} />
				<SpeedDialAction FabProps={{ disabled: getAncestryDepth >= 8 || getProgenyDepth >= 8 }} onClick={() => handleChange('Add')} icon={<UnfoldMoreRoundedIcon />} tooltipTitle={`Add Ancestors & Children levels by 1)`} />
				<SpeedDialAction FabProps={{ disabled: getAncestryDepth <= 0 || getProgenyDepth <= 0 }} onClick={() => handleChange('Sub')} icon={<UnfoldLessRoundedIcon />} tooltipTitle={`Remove Ancestors & Children levels by 1)`} />
				<SpeedDialAction onClick={() => setOpen(true)} icon={<PeopleAltIcon />} tooltipTitle={`Select a person to view from their perspective`} />
			</SpeedDial>

			{ saving && <div style={{ position: 'fixed', top: '50%', right: '50%', zIndex: 9999 }}> <CircularProgress size={30} /> </div> }

			<Snackbar open={showSavedToast} autoHideDuration={3000} onClose={() => setShowSavedToast(false)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
				<Alert severity="success" onClose={() => setShowSavedToast(false)} variant="filled">
					Family tree saved!
				</Alert>
			</Snackbar>

			<Dialog open={getOpen} onClose={ () => setOpen(false) }>
				<DialogTitle>
					<div className={`flex flex-row justify-between items-center w-full`}>
						<Typography variant="h6" component="div"> People According to Generation </Typography>
						<Avatar onClick={resetTreeViewRoot} className={`${mode === 'dark' ? '' : '!bg-[#2d333a]'} cursor-pointer`}> <RefreshIcon className={`${mode === 'dark' ? '!text-[#ffffff]' : ''}`} /> </Avatar>
					</div>
				</DialogTitle>
				<DialogContent sx={{ maxHeight: '100vh', overflowY: 'auto', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
					{
						Array.from(generationalMap.entries())
						.sort((a, b) => a[0] - b[0])
						.map(([level, people]) => (
							<Accordion key={level} defaultExpanded={  level === 0 } expanded={expanded === `panel${level}-content`} onChange={handleChangeAccordian(`panel${level}-content`)}>
								<AccordionSummary expandIcon={<ArrowDownwardIcon />} aria-controls={`panel${level}-content`} id={`panel${level}-header`}>
									{/* <Typography component="span">Accordion 1</Typography> */}
									{level === 0 ? 'Root Generation' : level < 0 ? `Gen ${Math.abs(level)} ↑` : `Gen ${level} ↓`}
								</AccordionSummary>
								<AccordionDetails>
									<Masonry columns={{ xs: 1, sm: 2, md: 3 }} spacing={{ xs: 1, sm: 2, md: 3 }} sequential>
									{
										people
											// .sort((a, b) => String(a.data['first name'] || '').localeCompare(String(b.data['first name'] || '')))
											.sort((a, b) => {
												const yearA = parseInt(a.data['birth year'] as string) || null;
												const yearB = parseInt(b.data['birth year'] as string) || null;

												if (yearA && yearB) return yearA - yearB;
												if (yearA) return -1;
												if (yearB) return 1;
												return 0;
											})
											.map(person => {
												const fullName = `${person.data['first name'] || 'Unknown'} ${person.data['last name'] || ''}`;
												const photoUrl = person.data.avatar || '/default-avatar.png'; // Fallback image

												return (
													<Card key={person.id} onClick={() => handlePersonSelect(person.id)} className="cursor-pointer">
														<CardMedia component="img" image={person.data.avatar as string} alt={fullName} />
														<CardContent className="flex flex-col justify-center items-start">
															<Typography variant="caption" component="div">{fullName}</Typography>
														</CardContent>
													</Card>
												);
											})
									}
									</Masonry>
								</AccordionDetails>
							</Accordion>
						))
					}
				</DialogContent>
				<DialogActions>
					<Button onClick={ () => setOpen(false) }>
						<Typography variant="button" className={`${mode === 'dark' ? 'text-white' : 'text-[#2D333A]'}`}>Close</Typography>
					</Button>
				</DialogActions>
			</Dialog>

			<Dialog open={uploadModalOpen} onClose={() => setUploadModalOpen(false)}>
				<DialogTitle>Upload Avatar to Cloudinary</DialogTitle>
				<DialogContent>
					<Button variant="outlined" className={`${mode === 'dark' ? '' : '!text-[#2D333A] !border-1 !border-[#2D333A]'} `} component="label">
						Choose Image
						<input hidden accept="image/*" type="file" onChange={(e) => handleUpload(e.target.files![0])} />
					</Button>

					{ uploading && <CircularProgress size={20} style={{ marginLeft: 10 }} /> }

					{
						imageUrl && (
							<Stack spacing={1} mt={2}>
								<Typography variant="body2" className={`${mode === 'dark' ? '' : 'text-[#2D333A]'}`}>Uploaded URL:</Typography>
								<TextField fullWidth value={imageUrl} InputProps={{ readOnly: true }} />
								<Button startIcon={<ContentCopyIcon />} onClick={() => copyToClipboard(imageUrl)}>
									<Typography variant="button" className={`${mode === 'dark' ? '' : 'text-[#2D333A]'}`}>Copy to Clipboard</Typography>
								</Button>
							</Stack>
						)
					}
				</DialogContent>
				<DialogActions>
					<Button onClick={() => { setUploadModalOpen(false); setImageUrl(''); }}>
						<Typography variant="button" className={`${mode === 'dark' ? '' : 'text-[#2D333A]'}`}>Close</Typography>
					</Button>
				</DialogActions>
			</Dialog>
		</>
	);
}