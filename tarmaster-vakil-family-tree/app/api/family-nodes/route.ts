
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { authOptions } from '@/lib/authOptions';
import { getServerSession } from "next-auth/next";
import { NextRequest, NextResponse } from 'next/server';
import { filterMeaningfulFamilyNodes } from '@/lib/helper/filterMeaningfulFamilyNodes';

// GET handler
export async function GET() {
	const session = await getServerSession(authOptions);

	if (!session || !session.user?.id) return new Response("Unauthorized", { status: 401 });

	const familyNodes = await prisma.familyNode.findMany();

	return Response.json(familyNodes);
}

// Post handler
export async function POST(req: NextRequest) {
	const session = await getServerSession(authOptions);
	if (!session || !session.user?.id) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}

	const userId = session.user.id;
	const body = await req.json();

	if (!Array.isArray(body)) {
		return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
	}

	// ✅ Filter meaningful nodes *before* any relationship handling
	const cleanedData = filterMeaningfulFamilyNodes(body);

	// ✅ Build a Set of valid node IDs — we'll use it to validate relationships too
	const validNodeIds = new Set(cleanedData.map((node) => node.id));

	// Queue to apply reverse relationships after all nodes are saved
	const reverseRelsQueue: {
		nodeId: string;
		rels: {
			parents?: string[];
			father?: string;
			mother?: string;
			spouses?: string[];
			children?: string[];
		};
	}[] = [];

	for (const node of cleanedData) {
		const { id, data, rels = {} } = node;

		// Only allow rels that point to *valid* nodes
		const cleanedRels = {
			...(rels.parents && Array.isArray(rels.parents) ? { parents: rels.parents.filter((pid: string) => validNodeIds.has(pid)) } : {}),
			...(rels.father && validNodeIds.has(rels.father) ? { father: rels.father } : {}),
			...(rels.mother && validNodeIds.has(rels.mother) ? { mother: rels.mother } : {}),
			...(Array.isArray(rels.spouses)
				? { spouses: rels.spouses.filter((sid: string) => validNodeIds.has(sid)) }
				: {}),
			...(Array.isArray(rels.children)
				? { children: rels.children.filter((cid: string) => validNodeIds.has(cid)) }
				: {}),
		};

		await prisma.familyNode.upsert({
			where: { id },
			create: {
				id,
				parentId: cleanedRels.father ?? null,
				data,
				rels: cleanedRels,
				createdById: userId,
			},
			update: {
				parentId: cleanedRels.father ?? null,
				data,
				rels: cleanedRels,
			},
		});

		reverseRelsQueue.push({ nodeId: id, rels: cleanedRels });
	}

	for (const { nodeId, rels } of reverseRelsQueue) {
		await applyReverseRelationships(nodeId, rels);
	}

	return NextResponse.json({ status: 'success', count: cleanedData.length });
}


async function applyReverseRelationships(nodeId: string, rels: { parents?: string[]; father?: string; mother?: string; spouses?: string[]; children?: string[] }) {
	if (!nodeId) return;

	// Add this node as a child to father & mother
	const parentUpdates = [];
	if (rels.father) {
		parentUpdates.push(addChildRelation(rels.father, nodeId));
	}
	if (rels.mother) {
		parentUpdates.push(addChildRelation(rels.mother, nodeId));
	}

	// Add this node as a spouse to its spouses
	if (Array.isArray(rels.spouses)) {
		for (const spouseId of rels.spouses) {
			parentUpdates.push(addSpouseRelation(spouseId, nodeId));
		}
	}

	await Promise.all(parentUpdates);
}

async function addChildRelation(parentId: string, childId: string) {
	const parent = await prisma.familyNode.findUnique({ where: { id: parentId } });
	if (!parent) return;

	const rels = (parent.rels || {}) as Prisma.JsonObject;

	let children: string[] = [];

	if (Array.isArray(rels.children)) {
		// Type-safe filter: only keep valid strings
		children = rels.children.filter((c): c is string => typeof c === 'string' && c.trim() !== '');
	} else if (typeof rels.children === 'string' && rels.children.trim() !== '') {
		children = [rels.children];
	}

	if (!children.includes(childId)) {
		const updatedChildren = Array.from(new Set([...children, childId]));

		await prisma.familyNode.update({
			where: { id: parentId },
			data: {
				rels: {
					...rels,
					children: updatedChildren,
				},
			},
		});
	}
}

async function addSpouseRelation(spouseId: string, currentId: string) {
	const node = await prisma.familyNode.findUnique({ where: { id: spouseId } });
	if (!node) return;

	const rels = (node.rels || {}) as Prisma.JsonObject;
	const spouses = Array.isArray(rels.spouses) ? [...rels.spouses] : [];

	if (!spouses.includes(currentId)) {
		spouses.push(currentId);
		await prisma.familyNode.update({
			where: { id: spouseId },
			data: {
				rels: {
					...rels,
					spouses,
				},
			},
		});
	}
}
