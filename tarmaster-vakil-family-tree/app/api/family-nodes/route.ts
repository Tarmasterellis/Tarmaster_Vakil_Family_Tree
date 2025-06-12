
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { authOptions } from '@/lib/authOptions';
import { getServerSession } from "next-auth/next";
import { NextRequest, NextResponse } from 'next/server';

// GET handler
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET() {
	const session = await getServerSession(authOptions);

	if (!session || !session.user?.id) return new Response("Unauthorized", { status: 401 });

	const familyNodes = await prisma.familyNode.findMany();

	return Response.json(familyNodes);
}

// POST handler
export async function POST(req: NextRequest) {
	const session = await getServerSession(authOptions);
	if (!session || !session.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

	let tree = [];
	try {
		tree = await req.json();
		console.log('Received tree:', tree);
	} catch (err) {
		console.error('❌ Invalid JSON:', err);
		return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
	}

	try {
		const results = await Promise.all(
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			tree.map(async (node: any) => {
				// Skip if data is not an object or empty
				if (!node.data || typeof node.data !== 'object' || Array.isArray(node.data)) {
					console.log(`⏭️ Skipped node ${node.id} - invalid or missing data`);
					return { skipped: true, nodeId: node.id, reason: 'Invalid or missing data' };
				}

				const data = node.data as Prisma.JsonObject;

				const isEmpty = Object.values(data).every(
					val => val === '' || val === null || val === undefined || (typeof val === 'string' && val.trim() === '')
				);

				const hasOnlyGender =
					Object.keys(data).length === 1 &&
					(data['gender'] === 'M' || data['gender'] === 'F');

				if (isEmpty || hasOnlyGender) {
					console.log(`⏭️ Skipped node ${node.id} - empty or only gender`);
					return { skipped: true, nodeId: node.id, reason: 'Empty data or only gender' };
				}

				const rels = {
					father: typeof node.rels?.father === 'string' ? node.rels.father : undefined,
					mother: typeof node.rels?.mother === 'string' ? node.rels.mother : undefined,
					spouses: Array.isArray(node.rels?.spouses) ? node.rels.spouses : [],
					children: Array.isArray(node.rels?.children) ? node.rels.children : [],
				};

				const saved = await prisma.familyNode.upsert({
					where: { id: node.id },
					create: {
						id: node.id,
						parentId: node.parentId ?? null,
						data: node.data,
						rels: node.rels,
						createdBy: {
							connectOrCreate: {
								where: { id: session.user.id },
								create: {
									id: session.user.id,
									name: session.user.name || 'unknown@unknown.com',
									email: session.user.email || 'unknown@unknown.com',
									image:
										session.user.image ||
										'https://static8.depositphotos.com/1009634/988/v/950/depositphotos_9883921-stock-illustration-no-user-profile-picture.jpg',
								},
							},
						},
					},
					update: {
						parentId: node.parentId ?? null,
						data: node.data,
						rels: rels,
					},
				});

				await cleanupEmptyNode(node.id);

				return { saved };
			})
		);

		const savedCount = results.filter(r => r && r.saved).length;
		const skippedNodes = results.filter(r => r && r.skipped);

		return NextResponse.json({
			message: 'Saved with restrictions',
			saved: savedCount,
			skipped: skippedNodes.length,
			skippedDetails: skippedNodes,
		});
	} catch (err) {
		console.error('❌ Prisma Error:', err);
		return NextResponse.json({ error: 'Failed to save nodes' }, { status: 500 });
	}
}


async function cleanupEmptyNode(nodeId: string) {
	const node = await prisma.familyNode.findUnique({ where: { id: nodeId } });

	if (!node || typeof node.data !== 'object' || Array.isArray(node.data)) return;

	const data = node.data as Prisma.JsonObject;

	const isEmpty = Object.values(data).every(
		value => value === '' || value === null || (typeof value === 'string' && value.trim() === '')
	);

	const hasOnlyGender =
		Object.keys(data).length === 1 &&
		(data['gender'] === 'M' || data['gender'] === 'F');

	if (isEmpty || hasOnlyGender) {
		await prisma.familyNode.delete({ where: { id: nodeId } });
		console.log(`🗑️ Deleted node ${nodeId} due to empty data or only gender.`);
		return;
	}

	// Clean invalid relationship references
	// if (typeof node.rels === 'object' && !Array.isArray(node.rels)) {
	if (node.rels && typeof node.rels === 'object' && !Array.isArray(node.rels)) {
		const rels = node.rels as Prisma.JsonObject;
		const validRels: Prisma.JsonObject = {
			spouses: [],
			children: [],
		};

		const idsToCheck: string[] = [];

		if (typeof rels.father === 'string') idsToCheck.push(rels.father);
		if (typeof rels.mother === 'string') idsToCheck.push(rels.mother);
		if (Array.isArray(rels.spouses)) idsToCheck.push(...rels.spouses as string[]);
		if (Array.isArray(rels.children)) idsToCheck.push(...rels.children as string[]);

		const existingNodes = await prisma.familyNode.findMany({
			where: { id: { in: idsToCheck } },
			select: { id: true },
		});
		const existingIds = new Set(existingNodes.map(n => n.id));

		if (typeof rels.father === 'string' && existingIds.has(rels.father)) {
			validRels.father = rels.father;
		}
		if (typeof rels.mother === 'string' && existingIds.has(rels.mother)) {
			validRels.mother = rels.mother;
		}
		if (Array.isArray(rels.spouses)) {
			validRels.spouses = rels.spouses.filter((id: unknown) => typeof id === 'string' && existingIds.has(id));
		}
		if (Array.isArray(rels.children)) {
			validRels.children = rels.children.filter((id: unknown) => typeof id === 'string' && existingIds.has(id));
		}

		// Ensure empty arrays are preserved for spouses/children
		if (!Array.isArray(validRels.spouses)) validRels.spouses = [];
		if (!Array.isArray(validRels.children)) validRels.children = [];

		// Only update if different
		if (JSON.stringify(validRels) !== JSON.stringify(rels)) {
			await prisma.familyNode.update({
				where: { id: nodeId },
				data: { rels: validRels },
			});
			console.log(`🔧 Cleaned invalid rels from node ${nodeId}`);
		}
	}
}