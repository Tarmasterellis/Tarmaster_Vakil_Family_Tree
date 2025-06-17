import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {

	const session = await getServerSession(authOptions);

	if (!session || !session.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

	const node = await req.json();

	try
	{
		const existing = await prisma.familyNode.findUnique({ where: { id: node.id } });

		if (existing)
		{
			if (existing.id !== session.user.id) return NextResponse.json({ error: 'Permission denied' }, { status: 403 });

			await prisma.familyNode.update({ where: { id: node.id }, data: { data: node.data, rels: node.rels } });
		}
		else await prisma.familyNode.create({ data: { id: node.id, createdById: session.user.id, data: node.data, rels: node.rels, } });

		return NextResponse.json({ success: true });
	} catch (err) {
		console.error('DB error:', err);
		return NextResponse.json({ error: 'Failed to save node' }, { status: 500 });
	}
}
