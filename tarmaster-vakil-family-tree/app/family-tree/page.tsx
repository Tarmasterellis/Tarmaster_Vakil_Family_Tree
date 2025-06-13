'use client';

import f3 from 'family-chart';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Tooltip from '@mui/material/Tooltip';
import { useSession } from "next-auth/react";
import 'family-chart/styles/family-chart.css';
import Snackbar from '@mui/material/Snackbar';
import SaveIcon from '@mui/icons-material/Save';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import RefreshIcon from '@mui/icons-material/RestartAlt';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CircularProgress from '@mui/material/CircularProgress';
import CloudUploadRoundedIcon from '@mui/icons-material/CloudUploadRounded';
import React, { useCallback, useEffect, useRef, useState, useLayoutEffect } from 'react';

type FamilyDatum = { id: string; rels: { father?: string; mother?: string; spouses?: string[]; children?: string[] }; data: Record<string, string | number>; };

export default function FamilyTree() {
	
	const { data: session } = useSession();
	const [saving, setSaving] = useState(false);
	const [imageUrl, setImageUrl] = useState('');
	const [uploading, setUploading] = useState(false);
	const contRef = useRef<HTMLDivElement | null>(null);
	const [rootId, setRootId] = useState<string | null>(null);
	const [showSavedToast, setShowSavedToast] = useState(false);
	const [uploadModalOpen, setUploadModalOpen] = useState(false);
	const createChartRef = useRef<(data: FamilyDatum[]) => void>(() => {});
	const chartRef = useRef<ReturnType<typeof f3.createChart> | null>(null);

	const saveTreeToDB = useCallback(async () => {
		if (!chartRef.current) return;
		setSaving(true);
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const rawData = chartRef.current.store.getData().map((n: any) => ({ ...n, rels: { father: n.rels?.father || undefined, mother: n.rels?.mother || undefined, spouses: Array.isArray(n.rels?.spouses) ? n.rels.spouses : [], children: Array.isArray(n.rels?.children) ? n.rels.children : [] } }));

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
			// put your full createChart logic here
			const processed = data.map(d => {
				const fullName = `${d.data['first name'] || ''} ${d.data['last name'] || ''}`.trim();
				const dob = [d.data['birth date'], d.data['birth month'], d.data['birth year']].filter(Boolean).join('-');
				const marriage = [d.data['marriage date'], d.data['marriage month'], d.data['marriage year']].filter(Boolean).join('-');
				const dod = [d.data['death date'], d.data['death month'], d.data['death year']].filter(Boolean).join('-');
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
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				.setSortChildrenFunction((a: any, b: any) => a.data['birth year'] === b.data['birth year'] ? 0 : a.data['birth year'] > b.data['birth year'] ? 1 : -1);

			chartRef.current = f3Chart;

			const f3Card = f3Chart.setCard(f3.CardHtml)
				.setCardDisplay([ ['Name'], ['Phone'], ['Email'], ['DOB'], ['Marriage'], ['Address'], ['DOD'], ['Occupation'] ])
				.setCardDim({ width: 500, height: 300, img_width: 250, img_height: 280 })
				.setMiniTree(true)
				.setStyle('imageRect')
				.setOnHoverPathToMain();

			f3Chart.updateMainId('cmbt2jp7c0003z30vy8mlq737');
			setRootId('cmbt2jp7c0003z30vy8mlq737');

			const f3EditTree = f3Chart.editTree()
				.fixed(true)
				.setFields([ 'first name', 'last name', 'email', 'gender', 'avatar', 'birth date', 'birth month', 'birth year', 'occupation', 'phone', 'address', 'marriage date', 'marriage month', 'marriage year', 'death date', 'death month', 'death year' ])
				.setEditFirst(true);

			f3EditTree.setEdit({ onUpdate: () => saveTreeToDB() });

			f3Card.setOnCardClick((e: MouseEvent, d: FamilyDatum) => {
				f3EditTree.open(d);
				if (f3EditTree.isAddingRelative()) return;
				f3Card.onCardClickDefault(e, d);
			});

			f3Chart.updateTree({ initial: true });
			f3EditTree.open(f3Chart.getMainDatum());
			f3Chart.updateTree({ initial: true });
		};
	}, [saveTreeToDB]);

	const resetTreeView = () => {
		if (chartRef.current && rootId) {
			chartRef.current.updateMainId(rootId);
			chartRef.current.updateTree();
		}
	};

	useLayoutEffect(() => {
		if (!contRef.current) return;

		fetch('/api/family-nodes')
			.then(res => res.json() )
			.then(data => createChartRef.current(data) )
			.catch(err => {
				console.error('Failed to load initial data:', err);
				createChartRef.current([{ id: '0', rels: { father: undefined, mother: undefined, spouses: [], children: [] }, data: { "first name": "No Name", "last name": "No Surname", "birthday": 0, "avatar": "https://static8.depositphotos.com/1009634/988/v/950/depositphotos_9883921-stock-illustration-no-user-profile-picture.jpg", "gender": "", "email": "", "birth date": "", "birth month": "", "birth year": "", "occupation": "", "phone": "", "address": "", "marriage date": "", "marriage month": "", "marriage year": "", "death date": "", "death month": "", "death year": "" } }]);
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

	return (
		<>
			<div className="f3 f3-cont" id="FamilyChart" ref={contRef}></div>

			<Stack hidden={!session?.user} direction={{ xs: 'column', sm: 'row' }} spacing={1} flexWrap="wrap" sx={{ position: 'fixed', top: 100, left: 10, zIndex: 9999, backgroundColor: 'background.paper', padding: 1, borderRadius: 2, boxShadow: 3, color: '#FFFFFF' }}> 
				<Tooltip title="Save family tree to database" arrow>
					<IconButton color="inherit" onClick={saveTreeToDB}> <SaveIcon /> </IconButton>
				</Tooltip>

				<Tooltip title="Upload an avatar image" arrow>
					<IconButton color="inherit" onClick={() => setUploadModalOpen(true)}> <CloudUploadRoundedIcon /> </IconButton>
				</Tooltip>

				<Tooltip title="Reset view to root person" arrow>
					<IconButton color="inherit" onClick={resetTreeView}> <RefreshIcon /> </IconButton>
				</Tooltip>
			</Stack>

			{ saving && <div style={{ position: 'fixed', top: '50%', right: '50%', zIndex: 9999 }}> <CircularProgress size={30} /> </div> }

			<Snackbar open={showSavedToast} autoHideDuration={3000} onClose={() => setShowSavedToast(false)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
				<Alert severity="success" onClose={() => setShowSavedToast(false)} variant="filled">
					Family tree saved!
				</Alert>
			</Snackbar>

			<Dialog open={uploadModalOpen} onClose={() => setUploadModalOpen(false)}>
				<DialogTitle>Upload Avatar to Cloudinary</DialogTitle>
				<DialogContent>
					<Button variant="outlined" component="label"> Choose Image <input hidden accept="image/*" type="file" onChange={(e) => handleUpload(e.target.files![0])} /> </Button>

					{ uploading && <CircularProgress size={20} style={{ marginLeft: 10 }} /> }

					{
						imageUrl && (
							<Stack spacing={1} mt={2}>
								<Typography variant="body2">Uploaded URL:</Typography>
								<TextField fullWidth value={imageUrl} InputProps={{ readOnly: true }} />
								<Button startIcon={<ContentCopyIcon />} onClick={() => copyToClipboard(imageUrl)}> Copy to Clipboard </Button>
							</Stack>
						)
					}
				</DialogContent>
				<DialogActions>
					<Button onClick={() => { setUploadModalOpen(false); setImageUrl(''); }}>Close</Button>
				</DialogActions>
			</Dialog>
		</>
	);
}