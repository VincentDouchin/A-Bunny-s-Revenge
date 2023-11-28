import { World as RapierWrold, init } from '@dimforge/rapier3d-compat'
import { World as MiniplexWorld } from 'miniplex'
import { loadAssets } from './assets'
import type { Entity } from './entity'
import { Time } from '@/lib/time'

await init()
export const world = new RapierWrold({ x: 0, y: -9.81, z: 0 })
export const assets = await loadAssets()
export const time = new Time()
export const ecs = new MiniplexWorld<Entity>()