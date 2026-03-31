import type { Tags } from '@assets/tagsList'
import type { NavMesh } from 'navcat'
import type { QuaternionLike, Vector3Like } from 'three/webgpu'
import type { Direction } from '@/lib/directions'

export type EditorTags = Record<string, { type: 'tag' } | { type: 'enum'; values: string[] } | { type: 'number' } | { type: 'string' }>
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

export type MapNames = 'heightMap' | 'treeMap' | 'pathMap' | 'waterMap' | 'grassMap' | 'grassNoise'

export interface InstanceEntity {
	position: Vector3Like
	rotation: QuaternionLike
	scale: Vector3Like
	collider: boolean
	transparent?: boolean
	doorDungeon?: Direction
}
export interface InstanceData {
	category: string
	model: string
	entities: Array<InstanceEntity>
}
export interface LevelData {
	sizeX: number
	sizeY: number
	entities: Record<string, LevelEntity>
	instances: Record<string, InstanceData>
	displacementScale: number
	floorTexture: 'planks' | 'grass'
	navMesh: NavMesh | null
	grass: [number, number, number, number][]
}
export type LevelLoaded = LevelData & Partial<Record<MapNames, HTMLCanvasElement>>
export type Shape = 'cuboid' | 'ball' | 'capsule' | 'cylinder'
export type ColliderData =
	| {
			type: Shape
			size: { x: number; y: number; z: number }
			position: { x: number; y: number; z: number }
			rotation: number[]
	  }
	| {
			type: 'link'
			category: string
			model: string
	  }
	| {
			type: 'trimesh'
	  }

export interface AssetData {
	collider?: ColliderData
	secondaryColliders?: ColliderData[]
	scale?: [number, number, number]
	tags?: Partial<Tags>
}
