import type { Tags } from '@assets/tagsList'

export type EditorTags = Record<string, true | string[]>
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
	tags?: Partial<Tags>
}

type Maps = 'heightMap' | 'treeMap' | 'pathMap' | 'waterMap' | 'grassMap'

export interface InstanceData {
	category: string
	model: string
	entities: Array<number[]>
	data?: Record<string, any>
}
export interface BaseLevel {
	sizeX: number
	sizeY: number
	entities: Record<string, LevelEntity>
	instances: Record<string, InstanceData>
	displacementScale: number
	floorTexture: 'planks' | 'grass'
}
export type LevelData = Record<Maps, string> & BaseLevel
export type LevelLoaded = Record<Maps, HTMLCanvasElement> & BaseLevel

export type ColliderData = {
	type: 'ball' | 'cuboid' | 'capsule' | 'cylinder'
	size: { x: number, y?: number, z?: number }
	position: { x: number, y: number, z: number }
} | {
	type: 'link'
	category: string
	model: string
}

export interface AssetData {
	collider?: ColliderData
	secondaryColliders?: ColliderData[]
	scale?: [number, number, number]
	tags?: Partial<Tags>
}