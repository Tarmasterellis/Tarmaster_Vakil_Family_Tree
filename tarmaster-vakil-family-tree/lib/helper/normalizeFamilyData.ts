/* eslint-disable @typescript-eslint/no-explicit-any */

export type FamilyDatum = {
  id: string;
  data: Record<string, any>;
  rels: {
    father?: string;
    mother?: string;
    spouses?: string[];
    children?: string[];
  };
};

/**
 * NORMALIZES FAMILY DATA
 * - Enforces bidirectional relationships
 * - Auto-fixes missing rels
 * - Does NOT invent parents
 */
export function normalizeFamilyData(input: FamilyDatum[]): FamilyDatum[] {
  const map = new Map<string, FamilyDatum>();

  // --- 1. Clone + sanitize ---
  for (const n of input) {
    map.set(n.id, {
      ...n,
      rels: {
        father: n.rels?.father || undefined,
        mother: n.rels?.mother || undefined,
        spouses: Array.isArray(n.rels?.spouses)
          ? [...new Set(n.rels.spouses.filter(Boolean))]
          : [],
        children: Array.isArray(n.rels?.children)
          ? [...new Set(n.rels.children.filter(Boolean))]
          : [],
      },
    });
  }

  // --- 2. Parent → Child enforcement ---
  for (const node of map.values()) {
    const { father, mother } = node.rels;

    if (father && map.has(father)) {
      const f = map.get(father)!;
      f.rels.children!.push(node.id);
      f.rels.children = uniq(f.rels.children);
    }

    if (mother && map.has(mother)) {
      const m = map.get(mother)!;
      m.rels.children!.push(node.id);
      m.rels.children = uniq(m.rels.children);
    }
  }

  // --- 3. Child → Parent enforcement ---
  for (const parent of map.values()) {
    const gender = parent.data.gender?.toString().toUpperCase();

    for (const childId of parent.rels.children || []) {
      const child = map.get(childId);
      if (!child) continue;

      if (gender === 'M' && !child.rels.father) {
        child.rels.father = parent.id;
      }

      if (gender === 'F' && !child.rels.mother) {
        child.rels.mother = parent.id;
      }
    }
  }

  // --- 4. Spouse ↔ Spouse enforcement ---
  for (const node of map.values()) {
    for (const spouseId of node.rels.spouses || []) {
      const spouse = map.get(spouseId);
      if (!spouse) continue;

      spouse.rels.spouses!.push(node.id);
      spouse.rels.spouses = uniq(spouse.rels.spouses);
    }
  }

  // --- 5. Parent → Children index (for sibling / cousin logic later) ---
  const parentToChildren = new Map<string, Set<string>>();

  for (const node of map.values()) {
    if (node.rels.father) {
      let set = parentToChildren.get(node.rels.father);
      if (!set) {
        set = new Set();
        parentToChildren.set(node.rels.father, set);
      }
      set.add(node.id);
    }

    if (node.rels.mother) {
      let set = parentToChildren.get(node.rels.mother);
      if (!set) {
        set = new Set();
        parentToChildren.set(node.rels.mother, set);
      }
      set.add(node.id);
    }
  }

  // Siblings are derived later using shared parents — not stored here

  return [...map.values()];
}

/* -------------------- HELPERS -------------------- */

function uniq(arr: string[] = []): string[] {
  return [...new Set(arr.filter(Boolean))];
}
