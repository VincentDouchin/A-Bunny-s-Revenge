import { Euler, Group, Sprite, SpriteMaterial } from 'three'
import { assets, ecs } from '@/global/init'
import { range } from '@/utils/mapFunctions'
import type { Entity } from '@/global/entity'

export const stunBundle = (offset: number) => {
	const group = new Group()
	group.position.y = offset + 5
	range(0, 5, (i) => {
		const angle = i / 5 * (Math.PI * 2)
		const star = new Sprite(new SpriteMaterial({ map: assets.particles.star, depthWrite: false }))
		star.scale.setScalar(2)
		star.position.x = Math.cos(angle) * 5
		star.position.y = Math.sin(angle) * 5
		group.add(star)
	})
	return { stun: group } as const satisfies Entity
}

const stunQuery = ecs.with('stun', 'rotation', 'size', 'group')

export const rotateStun = () => {
	for (const { stun, rotation } of stunQuery) {
		const invertRot = new Euler().setFromQuaternion(rotation.clone().invert())
		invertRot.z = stun.rotation.z + 0.1
		stun.rotation.copy(invertRot)
	}
}
