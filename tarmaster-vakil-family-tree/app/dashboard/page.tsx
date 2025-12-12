'use client';

import dynamic from 'next/dynamic';

const FamilyTree = dynamic(() => import('@/app/family-tree/page'), { ssr: false });

export default function DashboardPage() { return <FamilyTree /> }
