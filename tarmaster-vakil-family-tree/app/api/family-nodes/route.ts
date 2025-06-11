import { prisma } from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { NextRequest, NextResponse } from 'next/server';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

// GET handler
export async function GET(req: Request) {
	const session = await getServerSession(authOptions);

	if (!session || !session.user?.id) return new Response("Unauthorized", { status: 401 });

	const familyNodes = await prisma.familyNode.findMany();

	return Response.json(familyNodes);
}

// POST handler
export async function POST(req: NextRequest) {
	const session = await getServerSession(authOptions);
	if (!session || !session.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
			tree.map(async (node: any) => {
				const existing = await prisma.familyNode.findUnique({
					where: { id: node.id },
					include: { createdBy: true },
				});

				// If exists and owned by someone else, skip and show who can edit
				if (existing && existing.createdById !== session.user.id) {
					console.warn(`❌ Node ${node.id} is owned by ${existing.createdBy.name} (${existing.createdBy.email}). Skipping.`);
					return {
						skipped: true,
						nodeId: node.id,
						owner: existing.createdBy.name || existing.createdBy.email || "Unknown"
					};
				}

				const saved = await prisma.familyNode.upsert({
					where: { id: node.id },
					create: { id: node.id, parentId: node.parentId ?? null, data: node.data, rels: node.rels, createdBy: { connect: { id: session.user.id } } },
					update: { parentId: node.parentId ?? null, data: node.data, rels: node.rels },
				});

				return { saved };
			})
		);

		const savedCount = results.filter(r => r && r.saved).length;
		const skippedNodes = results.filter(r => r && r.skipped);

		return NextResponse.json({
			message: 'Saved with restrictions',
			saved: savedCount,
			skipped: skippedNodes.length,
			skippedDetails: skippedNodes
		});
	} catch (err) {
		console.error('❌ Prisma Error:', err);
		return NextResponse.json({ error: 'Failed to save nodes' }, { status: 500 });
	}
}
