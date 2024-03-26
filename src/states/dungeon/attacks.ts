import { ActiveCollisionTypes, ColliderDesc, RigidBodyDesc } from '@dimforge/rapier3d-compat'
import type { With } from 'miniplex'
import { ConeGeometry, Mesh, MeshToonMaterial, Quaternion, Vector3 } from 'three'
import type { Entity } from '@/global/entity'
import { ecs } from '@/global/init'
import type { Stat } from '@/lib/stats'
import { getWorldPosition } from '@/lib/transforms'
import { sleep } from '@/utils/sleep'
import { projectileTrail } from '@/particles/projectileTrail'

const projectileBundle = (angle: number, origin: Vector3, strength: Stat) => {
	const model = new Mesh(new ConeGeometry(1, 4, 7), new MeshToonMaterial({ color: 0x2C1E31 }))
	model.rotateX(Math.PI / 2)
	const rotation = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), angle)
	return {
		projectile: true,
		deathTimer: 3000,
		model,
		rotation,
		strength,
		emitter: projectileTrail(),
		movementForce: new Vector3(0, 0, 1).applyQuaternion(rotation),
		position: origin.clone().add(new Vector3(0, 5, 10).applyQuaternion(rotation)),
		bodyDesc: RigidBodyDesc.kinematicVelocityBased().lockRotations().setLinvel(...new Vector3(0, 0, 50).applyQuaternion(rotation).toArray()),
		colliderDesc: ColliderDesc.cone(2, 1).setActiveCollisionTypes(ActiveCollisionTypes.ALL).setSensor(true),
	} as const satisfies Entity
}

export const projectilesCircleAttack = async ({ group, strength }: With<Entity, 'group' | 'strength'>) => {
	for (let i = 0; i < 8; i++) {
		const origin = getWorldPosition(group)
		const angle = Math.PI * 2 / 8 * i
		ecs.add(projectileBundle(angle, origin, strength))
		await sleep(100)
	}
}