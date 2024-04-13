import { ActiveCollisionTypes, ColliderDesc, RigidBodyDesc } from '@dimforge/rapier3d-compat'
import type { With } from 'miniplex'
import { ConeGeometry, Mesh, MeshToonMaterial, Quaternion, Vector3 } from 'three'

import { type Entity, Faction } from '@/global/entity'
import { ecs } from '@/global/init'
import type { Stat } from '@/lib/stats'
import { getWorldPosition } from '@/lib/transforms'
import { projectileTrail } from '@/particles/projectileTrail'
import { sleep } from '@/utils/sleep'
import { Timer } from '@/lib/timer'

export type Attack = (entity: With<Entity, 'strength' | 'group'>) => unknown

const projectileBundle = (rotation: Quaternion, origin: Vector3, strength: Stat) => {
	const model = new Mesh(new ConeGeometry(1, 4, 7), new MeshToonMaterial({ color: 0x2C1E31 }))
	model.rotateX(Math.PI / 2)

	return {
		projectile: true,
		deathTimer: new Timer(3000, false),
		model,
		rotation,
		strength,
		faction: Faction.Enemy,
		state: 'attack',
		emitter: projectileTrail(),
		movementForce: new Vector3(0, 0, 1).applyQuaternion(rotation),
		position: origin.clone().add(new Vector3(0, 5, 10).applyQuaternion(rotation)),
		bodyDesc: RigidBodyDesc.kinematicVelocityBased().lockRotations().setLinvel(...new Vector3(0, 0, 50).applyQuaternion(rotation).toArray()),
		colliderDesc: ColliderDesc.cone(2, 1).setActiveCollisionTypes(ActiveCollisionTypes.ALL).setSensor(true),
	} as const satisfies Entity
}

export const projectileAttack = (rotation: Quaternion): Attack => ({ group, strength }) => {
	const origin = getWorldPosition(group)
	ecs.add(projectileBundle(rotation, origin, strength))
}

export const projectilesCircleAttack: Attack = async ({ group, strength }) => {
	for (let i = 0; i < 8; i++) {
		const origin = getWorldPosition(group)
		const angle = Math.PI * 2 / 8 * i
		const rotation = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), angle)
		ecs.add(projectileBundle(rotation, origin, strength))
		await sleep(100)
	}
}