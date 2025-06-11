'use client';

import f3 from 'family-chart';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import { useSession } from "next-auth/react";
import 'family-chart/styles/family-chart.css';
import Snackbar from '@mui/material/Snackbar';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import React, { useEffect, useRef, useState } from 'react';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CircularProgress from '@mui/material/CircularProgress';


type FamilyDatum = { id: string; rels: { spouses: string[]; children: string[] }; data: Record<string, string | number>; };

export default function FamilyTree() {
	
	const { data: session } = useSession();
	const [saving, setSaving] = useState(false);
	const [imageUrl, setImageUrl] = useState('');
	const [uploading, setUploading] = useState(false);
	const contRef = useRef<HTMLDivElement | null>(null);
	const [showSavedToast, setShowSavedToast] = useState(false);
	const [uploadModalOpen, setUploadModalOpen] = useState(false);
	const chartRef = useRef<ReturnType<typeof f3.createChart> | null>(null);

	useEffect(() => {
		if (!contRef.current) return;

		fetch('/api/family-nodes')
			.then(res => res.json())
			.then(data => createChart(data))
			.catch(err => {
				console.error('Failed to load initial data:', err);
				 // fallback Dummy chart
				createChart( [{ "id": "0", "rels": { "spouses": [], "children": [] }, "data": { "first name": "No Name", "last name": "No Surname", "birthday": 0, "avatar": "https://static8.depositphotos.com/1009634/988/v/950/depositphotos_9883921-stock-illustration-no-user-profile-picture.jpg", "gender": "", "email": "", "birth date": "", "birth month": "", "birth year": "", "occupation": "", "phone": "", "address": "", "marriage date": "", "marriage month": "", "marriage year": "", "death date": "", "death month": "", "death year": "" }}]);
			});

		function createChart(data: FamilyDatum[]) {
			const f3Chart = f3
				.createChart('#FamilyChart', data)
				.setTransitionTime(1000)
				.setCardXSpacing(400)
				.setCardYSpacing(400)
				.setSingleParentEmptyCard(true, { label: 'ADD' })
				.setShowSiblingsOfMain(false)
				.setOrientationVertical()
				.setSortChildrenFunction((a: any, b: any) => a.data['birth year'] === b.data['birth year'] ? 0 : a.data['birth year'] > b.data['birth year'] ? 1 : -1);

			chartRef.current = f3Chart;

			const f3Card = f3Chart.setCard(f3.CardHtml)
				.setCardDisplay([ ['first name', 'last name'], ['phone'], ['email'], ['birth date', 'birth month', 'birth year'], ['marriage date', 'marriage month', 'marriage year'], ['address'], ['death date', 'death month', 'death year'] ])
				.setCardDim({ width: 300, height: 200, img_width: 130, img_height: 200 })
				.setMiniTree(true)
				.setStyle('imageRect')
				.setOnHoverPathToMain();

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
		}
	}, []);

	async function saveTreeToDB() {
		if (!chartRef.current) return;
		setSaving(true);
		const rawData = chartRef.current.store.getData();

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
				if (result.skipped > 0) alert(`⚠️ ${result.skipped} node(s) were not saved. Only the creator (${result.skippedDetails.map((d: any) => d.owner).join(', ')}) can edit them.`);
				else setShowSavedToast(true);
			}
			else alert('Save failed!');
		}
		catch (err) { alert('Save failed!'); console.error(err); }
		finally { setSaving(false); }
	}

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

			<Stack hidden={ session?.user ? false : true } direction="row" spacing={2} style={{ position: 'fixed', bottom: 20, left: 20, zIndex: 9999 }}>
				<Button variant="contained" color="primary" onClick={saveTreeToDB}> Save to DB </Button>
				<Button variant="contained" color="secondary" onClick={() => setUploadModalOpen(true)}> Upload Avatar </Button>
			</Stack>

			{ saving && <div style={{ position: 'fixed', top: 10, right: 10, zIndex: 9999 }}> <CircularProgress size={28} /> </div> }

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
					<Button onClick={() => setUploadModalOpen(false)}>Close</Button>
				</DialogActions>
			</Dialog>
		</>
	);
}