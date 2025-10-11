export interface LevelEntity {
	category: string
	model: string
	position: [number, number, number]
	scale: [number, number, number]
	grounded: boolean
	rotation: number[]
	grid?: {
		repetitionX: number
		repetitionY: number
		spacingX: number
		spacingY: number
	}
}

export interface LevelData {
	sizeX: number
	sizeY: number
	entities: Record<string, LevelEntity>
	displacementScale: number
	heightMap: string
	treeMap: string
	pathMap: string
	waterMap: string
	grassMap: string

}

interface ColliderData {
	type: 'ball' | 'cuboid' | 'capsule' | 'cylinder'
	size: { x: number, y?: number, z?: number }
}

export interface AssetData {
	collider?: ColliderData
	secondaryColliders?: ColliderData[]
	scale?: [number, number, number]
}