
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FamilyDatum = { id: string; data: Record<string, any>; rels: { father?: string; mother?: string; spouses?: string[]; children?: string[]; }; };


const relationLabels: Record<string, [string, string]> = {
	'self': ['Self', 'Self'],
	'child': ['Son', 'Daughter'],
	'grandchild': ['Grandson', 'Granddaughter'],
	'great-grandchild': ['Great Grandson', 'Great Granddaughter'],
	'2nd-great-grandchild': ['2nd Great Grandson', '2nd Great Granddaughter'],
	'3rd-great-grandchild': ['3rd Great Grandson', '3rd Great Granddaughter'],
	'4th-great-grandchild': ['4th Great Grandson', '4th Great Granddaughter'],
	'5th-great-grandchild': ['5th Great Grandson', '5th Great Granddaughter'],
	'6th-great-grandchild': ['6th Great Grandson', '6th Great Granddaughter'],
	'7th-great-grandchild': ['7th Great Grandson', '7th Great Granddaughter'],
	'8th-great-grandchild': ['8th Great Grandson', '8th Great Granddaughter'],
	'parent': ['Father', 'Mother'],
	'grandparent': ['Grandfather', 'Grandmother'],
	'great-grandparent': ['Great Grandfather', 'Great Grandmother'],
	'2nd-great-grandparent': ['2nd Great Grandfather', '2nd Great Grandmother'],
	'3rd-great-grandparent': ['3rd Great Grandfather', '3rd Great Grandmother'],
	'4th-great-grandparent': ['4th Great Grandfather', '4th Great Grandmother'],
	'5th-great-grandparent': ['5th Great Grandfather', '5th Great Grandmother'],
	'6th-great-grandparent': ['6th Great Grandfather', '6th Great Grandmother'],
	'7th-great-grandparent': ['7th Great Grandfather', '7th Great Grandmother'],
	'8th-great-grandparent': ['8th Great Grandfather', '8th Great Grandmother'],
	'spouse': ['Husband', 'Wife'],
	'sibling': ['Brother', 'Sister'],
	'uncle': ['Uncle', 'Aunt'],
	'cousin': ['Cousin (M)', 'Cousin (F)'],
	'in-law-sibling': ['Brother-in-law', 'Sister-in-law'],
	'in-law-parent': ['Father-in-law', 'Mother-in-law'],
	'in-law-grandparent': ['Grandfather-in-law', 'Grandmother-in-law'],
	'in-law-great-grandparent': ['Great Grandfather-in-law', 'Great Grandmother-in-law'],
	'in-law-2nd-great-grandparent': ['2nd Great Grandfather-in-law', '2nd Great Grandmother-in-law'],
	'in-law-3rd-great-grandparent': ['3rd Great Grandfather-in-law', '3rd Great Grandmother-in-law'],
	'in-law-4th-great-grandparent': ['4th Great Grandfather-in-law', '4th Great Grandmother-in-law'],
	'in-law-5th-great-grandparent': ['5th Great Grandfather-in-law', '5th Great Grandmother-in-law'],
	'in-law-6th-great-grandparent': ['6th Great Grandfather-in-law', '6th Great Grandmother-in-law'],
	'in-law-7th-great-grandparent': ['7th Great Grandfather-in-law', '7th Great Grandmother-in-law'],
	'in-law-8th-great-grandparent': ['8th Great Grandfather-in-law', '8th Great Grandmother-in-law'],
	'in-law-child': ['Son-in-law', 'Daughter-in-law'],
	'in-law-grandchild': ['Grandson-in-law', 'Granddaughter-in-law'],
	'in-law-great-grandchild': ['Great Grandson-in-law', 'Great Granddaughter-in-law'],
	'in-law-2nd-great-grandchild': ['2nd Great Grandson-in-law', '2nd Great Granddaughter-in-law'],
	'in-law-3rd-great-grandchild': ['3rd Great Grandson-in-law', '3rd Great Granddaughter-in-law'],
	'in-law-4th-great-grandchild': ['4th Great Grandson-in-law', '4th Great Granddaughter-in-law'],
	'in-law-5th-great-grandchild': ['5th Great Grandson-in-law', '5th Great Granddaughter-in-law'],
	'in-law-6th-great-grandchild': ['6th Great Grandson-in-law', '6th Great Granddaughter-in-law'],
	'in-law-7th-great-grandchild': ['7th Great Grandson-in-law', '7th Great Granddaughter-in-law'],
	'in-law-8th-great-grandchild': ['8th Great Grandson-in-law', '8th Great Granddaughter-in-law']
};


function getGender(node: FamilyDatum): 'M' | 'F' | undefined {
	const g = node.data.gender?.toString().toUpperCase();
	return g === 'M' || g === 'F' ? g : undefined;
}

function formatInLawLabelFallback(key: string, gender: 'M' | 'F'): string {
	const parts = key.replace(/-/g, ' ').split(' ');
	// eslint-disable-next-line prefer-const
	let relation = parts.pop()!;
	// eslint-disable-next-line prefer-const
	let prefix = parts.join(' ');

	const genderMap: Record<string, [string, string]> = {
		child: ['Son', 'Daughter'],
		parent: ['Father', 'Mother'],
		grandchild: ['Grandson', 'Granddaughter'],
		grandparent: ['Grandfather', 'Grandmother']
	};

	const [maleTerm, femaleTerm] = genderMap[relation] || ['Relative', 'Relative'];
	const finalRelation = gender === 'M' ? maleTerm : femaleTerm;
	return `${prefix ? prefix + ' ' : ''}${finalRelation}-in-law`;
}

export function getComprehensiveRelationships(data: FamilyDatum[], rootId: string, targetId: string): string {
	
	const idToNode = new Map(data.map(d => [d.id, d]));

	const visited = new Set<string>();
	const queue: Array<{ id: string; path: string[] }> = [{ id: rootId, path: [] }];
	const relations: string[] = [];

	const getRelationKey = (base: 'child' | 'parent', gen: number): string => {
		if (gen === 1) return base;
		if (gen === 2) return base === 'child' ? 'grandchild' : 'grandparent';
		if (gen === 3) return base === 'child' ? 'great-grandchild' : 'great-grandparent';
		if (gen >= 4 && gen <= 10) {
			return `${gen - 2}th-great-${base}`;
		}
		return base;
	};

	const getRelationLabel = (relationPath: string[], gender: 'M' | 'F') => {
		const map: Record<string, string> = {
			'father': 'parent',
			'mother': 'parent',
			'child': 'child',
			'spouse': 'spouse'
		};

		const simplifiedPath = relationPath.map(r => map[r] || r);
		const relation = simplifiedPath.join('-');
		const count = (item: string) => simplifiedPath.filter(x => x === item).length;

		let label = 'Relative';

		const isInLaw = simplifiedPath.includes('spouse');
		const isParent = simplifiedPath.includes('parent');
		const isChild = simplifiedPath.includes('child');
		const isSibling = simplifiedPath.includes('sibling');

		if (isInLaw) {
			if (isParent && !isChild) {
				const gen = count('parent');
				const key = getRelationKey('parent', gen);
				const rawKey = `in-law-${key}`;
				label = relationLabels[rawKey]?.[gender === 'M' ? 0 : 1] || formatInLawLabelFallback(key, gender);
			} else if (isChild && !isParent) {
				const gen = count('child');
				const key = getRelationKey('child', gen);
				const rawKey = `in-law-${key}`;
				label = relationLabels[rawKey]?.[gender === 'M' ? 0 : 1] || formatInLawLabelFallback(key, gender);
			} else if (isSibling) {
				label = relationLabels['in-law-sibling'][gender === 'M' ? 0 : 1];
			} else {
				label = relationLabels['spouse'][gender === 'M' ? 0 : 1];
			}
		} else if (relation.includes('sibling') && relation.includes('child')) {
			label = relationLabels['cousin'][gender === 'M' ? 0 : 1];
		} else if (relation.includes('sibling')) {
			label = relationLabels['sibling'][gender === 'M' ? 0 : 1];
		} else if (isChild) {
			const gen = count('child');
			const key = getRelationKey('child', gen);
			label = relationLabels[key]?.[gender === 'M' ? 0 : 1]
				|| (gen === 1
					? (gender === 'M' ? 'Son' : 'Daughter')
					: `${gen - 2}th Great ${gender === 'M' ? 'Grandson' : 'Granddaughter'}`);
		} else if (isParent) {
			const gen = count('parent');
			const key = getRelationKey('parent', gen);
			label = relationLabels[key]?.[gender === 'M' ? 0 : 1]
				|| (gen === 1
					? (gender === 'M' ? 'Father' : 'Mother')
					: `${gen - 2}th Great ${gender === 'M' ? 'Grandfather' : 'Grandmother'}`);
		}

		return label;
	};

	while (queue.length) {
		const { id, path } = queue.shift()!;
		if (visited.has(id) || path.length > 10) continue;
		visited.add(id);

		const current = idToNode.get(id);
		if (!current) continue;

		if (id === targetId && path.length > 0) {
			const root = idToNode.get(rootId);
			const gender = getGender(current) ?? 'M';
			const rel = getRelationLabel(path, gender);
			const rootName = root?.data['first name']?.toString() || 'Unnamed';
			relations.push(`${rel} of ${rootName}`);
			continue;
		}

		const next = [
			...(current.rels.father ? [{ id: current.rels.father, label: 'father' }] : []),
			...(current.rels.mother ? [{ id: current.rels.mother, label: 'mother' }] : []),
			...(current.rels.spouses || []).map(id => ({ id, label: 'spouse' })),
			...(current.rels.children || []).map(id => ({ id, label: 'child' }))
		];

		for (const n of next) {
			queue.push({ id: n.id, path: [...path, n.label] });
		}
	}

	return [...new Set(relations)].join(', ');
}