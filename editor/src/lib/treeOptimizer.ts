import type { Vector2, Vector3Like } from 'three/webgpu'
import { Vector3 } from 'three'

import { BufferGeometry, Group, Line, LineBasicNodeMaterial, Mesh, MeshBasicNodeMaterial, SphereGeometry } from 'three/webgpu'

interface TreeData {
	position: Vector3Like
	radius: number
}

export interface GridData {
	grid: Set<string>
	gridSize: number
	levelWorldBounds: { minX: number; maxX: number; minZ: number; maxZ: number }
}
export const mergeGrids = (grid: GridData, ...grids: GridData[]) => {
	const newGrid = new Set([...grid.grid, ...grids.flatMap((g) => Array.from(g.grid))])
	return {
		...grid,
		grid: newGrid,
	}
}

function circleIntersectsCell(treeX: number, treeZ: number, radius: number, cellX: number, cellZ: number, gridSize: number): boolean {
	const cellMinX = cellX * gridSize
	const cellMaxX = (cellX + 1) * gridSize
	const cellMinZ = cellZ * gridSize
	const cellMaxZ = (cellZ + 1) * gridSize

	const closestX = Math.max(cellMinX, Math.min(treeX, cellMaxX))
	const closestZ = Math.max(cellMinZ, Math.min(treeZ, cellMaxZ))

	const dx = treeX - closestX
	const dz = treeZ - closestZ
	const distanceSquared = dx * dx + dz * dz

	return distanceSquared <= radius * radius
}

function cellIsInsideLevel(gridX: number, gridZ: number, gridSize: number, bounds: { minX: number; maxX: number; minZ: number; maxZ: number }): boolean {
	const cellCenterX = (gridX + 0.5) * gridSize
	const cellCenterZ = (gridZ + 0.5) * gridSize

	return cellCenterX >= bounds.minX && cellCenterX <= bounds.maxX && cellCenterZ >= bounds.minZ && cellCenterZ <= bounds.maxZ
}

// Grid operations
function initializeGrid(levelWidth: number, levelHeight: number, gridSize: number): GridData {
	const grid = new Set<string>()
	const halfWidth = levelWidth / 2
	const halfHeight = levelHeight / 2

	const levelWorldBounds = {
		minX: -halfWidth,
		maxX: halfWidth,
		minZ: -halfHeight,
		maxZ: halfHeight,
	}

	const startX = Math.floor(-halfWidth / gridSize)
	const endX = Math.ceil(halfWidth / gridSize)
	const startZ = Math.floor(-halfHeight / gridSize)
	const endZ = Math.ceil(halfHeight / gridSize)

	for (let gx = startX; gx <= endX; gx++) {
		for (let gz = startZ; gz <= endZ; gz++) {
			grid.add(`${gx},${gz}`)
		}
	}

	return { grid, gridSize, levelWorldBounds }
}

function cullEmptyCells(gridData: GridData, trees: TreeData[]): GridData {
	const cellsWithTrees = new Set<string>()

	trees.forEach((tree) => {
		const minCellX = Math.floor((tree.position.x - tree.radius) / gridData.gridSize)
		const maxCellX = Math.floor((tree.position.x + tree.radius) / gridData.gridSize)
		const minCellZ = Math.floor((tree.position.z - tree.radius) / gridData.gridSize)
		const maxCellZ = Math.floor((tree.position.z + tree.radius) / gridData.gridSize)

		for (let gx = minCellX; gx <= maxCellX; gx++) {
			for (let gz = minCellZ; gz <= maxCellZ; gz++) {
				if (circleIntersectsCell(tree.position.x, tree.position.z, tree.radius, gx, gz, gridData.gridSize)) {
					cellsWithTrees.add(`${gx},${gz}`)
				}
			}
		}
	})

	const newGrid = new Set(Array.from(gridData.grid).filter((key) => cellsWithTrees.has(key)))

	return { ...gridData, grid: newGrid }
}

function removeInteriorCells(gridData: GridData): GridData {
	// Step 1: Separate edge cells from interior cells
	const edgeCells = new Set<string>()
	const nonEdgeCells = new Set<string>()

	for (const key of gridData.grid) {
		const [gx, gz] = key.split(',').map(Number)

		const neighbors = [
			[gx - 1, gz - 1],
			[gx, gz - 1],
			[gx + 1, gz - 1],
			[gx - 1, gz],
			[gx + 1, gz],
			[gx - 1, gz + 1],
			[gx, gz + 1],
			[gx + 1, gz + 1],
		]

		const touchesEdge = neighbors.some(([nx, nz]) => !cellIsInsideLevel(nx, nz, gridData.gridSize, gridData.levelWorldBounds))

		if (touchesEdge) {
			edgeCells.add(key)
		} else {
			nonEdgeCells.add(key)
		}
	}

	// Step 2: From non-edge cells, keep only boundary cells
	const boundaryKeys = new Set<string>()

	for (const key of nonEdgeCells) {
		const [gx, gz] = key.split(',').map(Number)

		const neighbors = [
			[gx - 1, gz - 1],
			[gx, gz - 1],
			[gx + 1, gz - 1],
			[gx - 1, gz],
			[gx + 1, gz],
			[gx - 1, gz + 1],
			[gx, gz + 1],
			[gx + 1, gz + 1],
		]

		const hasEmptyInteriorNeighbor = neighbors.some(([nx, nz]) => {
			const isInside = cellIsInsideLevel(nx, nz, gridData.gridSize, gridData.levelWorldBounds)
			const isEmpty = !gridData.grid.has(`${nx},${nz}`)
			return isInside && isEmpty
		})

		if (hasEmptyInteriorNeighbor) {
			boundaryKeys.add(key)
		}
	}

	return { ...gridData, grid: boundaryKeys }
}

// Query functions
export function isInBoundaryCell(position: Vector3Like, radius: number, gridData: GridData): boolean {
	const minCellX = Math.floor((position.x - radius) / gridData.gridSize)
	const maxCellX = Math.floor((position.x + radius) / gridData.gridSize)
	const minCellZ = Math.floor((position.z - radius) / gridData.gridSize)
	const maxCellZ = Math.floor((position.z + radius) / gridData.gridSize)

	for (let gx = minCellX; gx <= maxCellX; gx++) {
		for (let gz = minCellZ; gz <= maxCellZ; gz++) {
			if (gridData.grid.has(`${gx},${gz}`) && circleIntersectsCell(position.x, position.z, radius, gx, gz, gridData.gridSize)) {
				return true
			}
		}
	}

	return false
}

// Main entry point
export function buildTreeBoundaryGrid(trees: TreeData[], levelSize: Vector2, gridSize: number = 5): GridData {
	let gridData = initializeGrid(levelSize.x, levelSize.y, gridSize)
	gridData = cullEmptyCells(gridData, trees)
	gridData = removeInteriorCells(gridData)
	return gridData
}

// Visualization
export function visualizeGrid(gridData: GridData) {
	const material = new LineBasicNodeMaterial({ color: 0x00ff00 })
	const material2 = new LineBasicNodeMaterial({ color: 0xff0000 })
	const group = new Group()

	gridData.grid.forEach((key) => {
		const [gx, gz] = key.split(',').map(Number)
		const x = gx * gridData.gridSize
		const z = gz * gridData.gridSize
		const inside = cellIsInsideLevel(gx, gz, gridData.gridSize, gridData.levelWorldBounds)

		const points = [
			new Vector3(x, 0, z),
			new Vector3(x + gridData.gridSize, 0, z),
			new Vector3(x + gridData.gridSize, 0, z + gridData.gridSize),
			new Vector3(x, 0, z + gridData.gridSize),
			new Vector3(x, 0, z),
		]

		const m = new Mesh(new SphereGeometry(1), new MeshBasicNodeMaterial())
		m.position.copy({ x: x + gridData.gridSize / 2, z: z + gridData.gridSize / 2, y: -2 })
		group.add(m)

		const geometry = new BufferGeometry().setFromPoints(points)
		const line = new Line(geometry, inside ? material2 : material)
		group.add(line)
	})

	return group
}
