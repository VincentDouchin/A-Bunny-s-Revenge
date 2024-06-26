import type { With } from 'miniplex'
import { Vector3 } from 'three'
import type { Collider } from '@dimforge/rapier3d-compat'
import type { Entity } from '@/global/entity'
import { world } from '@/global/init'

export const getIntersections = (e: With<Entity, 'position' | 'rotation' | 'sensor'>, group?: number, callback?: (collider: Collider) => boolean) => {
	const position = new Vector3(0, 0, e.sensor.distance).applyQuaternion(e.rotation).add(e.position)
	if (callback) {
		const colliders = new Array<Collider>()
		world.intersectionsWithShape(position, e.rotation, e.sensor.shape, (c) => {
			colliders.push(c)
			return true
		})
		return colliders.some(callback)
	} else {
		return world.intersectionWithShape(position, e.rotation, e.sensor.shape, undefined, group, e.collider)
	}
}
