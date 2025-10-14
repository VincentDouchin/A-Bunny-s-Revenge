import type { village } from '@assets/assets'
import type { RigidBodyType } from '@dimforge/rapier3d-compat'
import type { customModel } from '@/debug/props'
import type { AssetNames } from '@/global/entity'
import type { NavCell } from '@/lib/navGrid'

export type ModelName = AssetNames['models'] | customModel | AssetNames['vegetation'] | AssetNames['gardenPlots'] | AssetNames['fruitTrees'] | village
export interface EntityData<T extends Record<string, any> | undefined> {
	model: ModelName
	scale: number
	position: [number, number, number]
	rotation: [number, number, number, number]
	map: string
	data: T
}

export type LevelData = Record<string, EntityData<any> | null>
export type CollidersData = Partial<Record<ModelName, {
	type: RigidBodyType
	size?: [number, number, number]
	sensor: boolean
	offset: [number, number, number]
	scale: number | null

}>>
export type LevelImage = NonNullable<{ [k in keyof Level]: Level[k] extends HTMLCanvasElement ? k : never }[keyof Level]>

export type RawLevel = { [k in keyof Level]: Level[k] extends HTMLCanvasElement ? string : Level[k] }

export const leveltypes = ['farm', 'crossroad', 'dungeon', 'ruins', 'intro', 'cellar', 'village'] as const
export type LevelType = (typeof leveltypes)[number]
export interface Level {
	path: HTMLCanvasElement
	trees: HTMLCanvasElement
	grass: HTMLCanvasElement
	heightMap: HTMLCanvasElement
	water: HTMLCanvasElement
	rock: HTMLCanvasElement
	id: string
	name: string
	type?: LevelType
	navgrid?: NavCell[][]
	size: { x: number, y: number }
	containCamera: boolean
}