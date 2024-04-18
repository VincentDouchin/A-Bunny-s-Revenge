import { ActiveCollisionTypes, ColliderDesc, RigidBodyDesc, RigidBodyType } from '@dimforge/rapier3d-compat'
import type { With } from 'miniplex'
import { ConeGeometry, Mesh, MeshBasicMaterial, MeshToonMaterial, Quaternion, SphereGeometry, Vector3 } from 'three'

import { between } from 'randomish'
import { type Entity, Faction } from '@/global/entity'
import { ecs, time } from '@/global/init'
import { modelColliderBundle } from '@/lib/models'
import { ModStage, ModType, type Stat, createModifier } from '@/lib/stats'
import { Timer } from '@/lib/timer'
import { getWorldPosition } from '@/lib/transforms'
import { honeyDrippingParticles, honeySplatParticlesBundle } from '@/particles/honeySplatParticles'
import { pollenBundle } from '@/particles/pollenParticles'
import { projectileTrail } from '@/particles/projectileTrail'
import { sleep } from '@/utils/sleep'

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
		colliderDesc: ColliderDesc.cone(2, 1).setActiveCollisionTypes(ActiveCollisionTypes.ALL).setSensor(true).setRotation(new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), Math.PI / 2)),
	} as const satisfies Entity
}

export const projectileAttack = (rotation: Quaternion) => ({ group, strength }: With<Entity, 'group' | 'strength'>) => {
	const origin = getWorldPosition(group)
	ecs.add(projectileBundle(rotation, origin, strength))
}

export const projectilesCircleAttack = async ({ group, strength }: With<Entity, 'group' | 'strength'>) => {
	const initialAngle = Math.random() * Math.PI * 2
	for (let i = 0; i < 8; i++) {
		const origin = getWorldPosition(group)
		const angle = initialAngle + Math.PI * 2 / 8 * i
		const rotation = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), angle)
		ecs.add(projectileBundle(rotation, origin, strength))
		await sleep(100)
	}
}

export const honeyProjectile = ({ group, rotation }: With<Entity, 'group' | 'rotation' >) => {
	const origin = getWorldPosition(group)
	const size = 2
	const model = new Mesh(
		new SphereGeometry(size, 8, 8),
		new MeshBasicMaterial({ color: 0xF7F3B7, transparent: true, opacity: 0.6, depthWrite: false }),
	)
	const bundle = modelColliderBundle(model, RigidBodyType.Dynamic, true, new Vector3(1, 1, 1))
	bundle.bodyDesc.setLinearDamping(3)
	bundle.bodyDesc.gravityScale = 0.7
	bundle.bodyDesc.setLinvel(0, -8, 0)
	bundle.colliderDesc.setMass(1)
	ecs.add ({
		...bundle,
		rotation: rotation.clone(),
		position: new Vector3(0, 5, 0).add(origin),
		honeyProjectile: true,
		emitter: honeyDrippingParticles(),
		deathTimer: new Timer(2000, false),
		archingProjectile: new Vector3(0, 150, 100),
	})
}
const archingQuery = ecs.with('archingProjectile', 'body', 'rotation').without('bodyDesc')
export const applyArchingForce = () => archingQuery.onEntityAdded.subscribe(async (e) => {
	e.body.applyImpulse(e.archingProjectile.applyQuaternion(e.rotation), true)
})

const honeyProjectilesQuery = ecs.with('position', 'honeyProjectile')
export const honeySplat = () => {
	for (const honey of honeyProjectilesQuery) {
		if (honey.position.y <= 1) {
			ecs.remove(honey)
			ecs.add({
				...honeySplatParticlesBundle(),
				position: honey.position.clone().setY(1),
				honeySpot: createModifier('beeBoss', 'speed', -50, ModStage.Total, ModType.Percent, false, 5000),
			})
		}
	}
}

const speedQuery = ecs.with('speed', 'position').without('boss')
const honeySpotQuery = ecs.with('honeySpot', 'position')
export const stepInHoney = () => {
	for (const honeySpot of honeySpotQuery) {
		for (const entity of speedQuery) {
			if (honeySpot.position.distanceTo(entity.position) < 15) {
				entity.speed.addModifier(honeySpot.honeySpot)
			}
		}
	}
}

export const pollenAttack = async ({ group }: With<Entity, 'group'>) => {
	const origin = getWorldPosition(group)
	const max = Math.floor(between(3, 6))
	for (let i = 0; i < max; i++) {
		const angle = i / max * Math.PI * 2 + (Math.random() - 0.5)
		const distance = between(20, 70)
		ecs.add({
			position: new Vector3(Math.cos(angle) * distance, 0, Math.sin(angle) * distance).add(origin),
			...pollenBundle(),
			pollen: true,
		})
		await sleep(between(200, 600))
	}
}

const sneezeQuery = ecs.with('sneeze', 'position')
const pollenQuery = ecs.with('pollen', 'position')
export const tickSneeze = () => {
	for (const entity of sneezeQuery) {
		let closeBy = false
		for (const pollen of pollenQuery) {
			if (entity.position.distanceTo(pollen.position) < 10) {
				entity.sneeze.tick(time.delta)
				closeBy = true
			}
		}
		if (!closeBy) {
			entity.sneeze.tick(-time.delta / 5)
		}
	}
}
