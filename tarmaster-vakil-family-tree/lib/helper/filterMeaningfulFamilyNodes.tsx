

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FamilyNodeInput = { id: string; data: Record<string, any>; [key: string]: any; };


/**
 * Removes nodes where `data` only contains a `gender` field (M/F/Other)
 */

export function filterMeaningfulFamilyNodes(nodes: FamilyNodeInput[]): FamilyNodeInput[] {
	return nodes.filter((node) => {
		if (!node.data || typeof node.data !== 'object') return false;

		const keys = Object.keys(node.data);
		// Only one key and it's 'gender'
		if (keys.length === 1 && keys[0] === 'gender') return false;

		// If all other keys are empty or whitespace and only gender is present
		const hasMeaningfulData = keys.some((key) => {
		if (key === 'gender') return false;
			const value = node.data[key];
			return typeof value === 'string' && value.trim() !== '';
		});

		return hasMeaningfulData;
	});
}