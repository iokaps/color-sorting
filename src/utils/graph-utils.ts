/**
 * Graph utility functions for faction connectivity calculations
 * Provides DFS-based algorithms for finding connected components
 */

/**
 * Build an adjacency list from edge keys
 * @param edgeKeys - Array of edge keys in format "playerA:playerB"
 * @param parseEdge - Function to parse edge key into [playerA, playerB]
 * @returns Adjacency list as Map<string, Set<string>>
 */
export function buildAdjacencyList(
	edgeKeys: string[],
	parseEdge: (key: string) => [string, string]
): Map<string, Set<string>> {
	const adjacencyList = new Map<string, Set<string>>();

	for (const edgeKey of edgeKeys) {
		const [a, b] = parseEdge(edgeKey);
		if (!adjacencyList.has(a)) adjacencyList.set(a, new Set());
		if (!adjacencyList.has(b)) adjacencyList.set(b, new Set());
		adjacencyList.get(a)!.add(b);
		adjacencyList.get(b)!.add(a);
	}

	return adjacencyList;
}

/**
 * Find the connected component containing a specific node using iterative DFS
 * @param startNode - Starting node ID
 * @param adjacencyList - Graph adjacency list
 * @returns Set of all nodes in the component
 */
export function findConnectedComponent(
	startNode: string,
	adjacencyList: Map<string, Set<string>>
): Set<string> {
	const visited = new Set<string>();
	const stack = [startNode];

	while (stack.length > 0) {
		const node = stack.pop()!;
		if (visited.has(node)) continue;
		visited.add(node);

		for (const neighbor of adjacencyList.get(node) || []) {
			if (!visited.has(neighbor)) stack.push(neighbor);
		}
	}

	return visited;
}

/**
 * Find all connected components in a graph using iterative DFS
 * @param nodeIds - Set of all node IDs in the graph
 * @param adjacencyList - Graph adjacency list
 * @returns Array of Sets, each containing the nodes in a component
 */
export function findAllConnectedComponents(
	nodeIds: Set<string>,
	adjacencyList: Map<string, Set<string>>
): Set<string>[] {
	const visited = new Set<string>();
	const components: Set<string>[] = [];

	for (const startNode of nodeIds) {
		if (visited.has(startNode)) continue;

		const component = new Set<string>();
		const stack = [startNode];

		while (stack.length > 0) {
			const node = stack.pop()!;
			if (visited.has(node)) continue;
			visited.add(node);
			component.add(node);

			for (const neighbor of adjacencyList.get(node) || []) {
				if (!visited.has(neighbor)) stack.push(neighbor);
			}
		}

		components.push(component);
	}

	return components;
}

/**
 * Find the largest connected component and return its size
 * @param nodeIds - Set of all node IDs in the graph
 * @param adjacencyList - Graph adjacency list
 * @returns Size of the largest component
 */
export function findLargestComponentSize(
	nodeIds: Set<string>,
	adjacencyList: Map<string, Set<string>>
): number {
	const components = findAllConnectedComponents(nodeIds, adjacencyList);
	if (components.length === 0) return 0;
	return Math.max(...components.map((c) => c.size));
}

/**
 * Get all component sizes sorted from largest to smallest
 * @param nodeIds - Set of all node IDs in the graph
 * @param adjacencyList - Graph adjacency list
 * @returns Array of component sizes sorted descending
 */
export function getAllComponentSizes(
	nodeIds: Set<string>,
	adjacencyList: Map<string, Set<string>>
): number[] {
	const components = findAllConnectedComponents(nodeIds, adjacencyList);
	return components.map((c) => c.size).sort((a, b) => b - a);
}
