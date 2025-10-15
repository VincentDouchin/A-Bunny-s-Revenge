import type { app } from '@/global/states'
import type { Plugin } from '@/lib/app'
import { ColliderDesc, RigidBodyDesc, RigidBodyType } from '@dimforge/rapier3d-compat'
import { between } from 'randomish'
import { BufferGeometry, CatmullRomCurve3, Mesh, MeshBasicMaterial, PlaneGeometry, Quaternion, SphereGeometry, Vector3 } from 'three'
import { fishBehavior } from '@/behaviors/fishBehavior'
import { MenuType, stateBundle, States } from '@/global/entity'
import { assets, ecs, menuInputs, scene, tweens } from '@/global/init'
import { playSound } from '@/global/sounds'
import { runIf } from '@/lib/app'
import { inMap } from '@/lib/hierarchy'
import { MeshLine, MeshLineMaterial } from '@/lib/MeshLine'
import { Timer } from '@/lib/timer'
import { getWorldPosition } from '@/lib/transforms'
import { fishParticles } from '@/particles/fishParticles'
import { addItemToPlayer } from '@/utils/dialogHelpers'
import { range } from '@/utils/mapFunctions'
import { openMenu } from './openInventory'

const fishingPoleBundle = () => {
	const poleModel = assets.models.fishing_pole.scene.clone()
	poleModel.scale.setScalar(3)
	poleModel.rotateY(-Math.PI / 2)
	poleModel.rotateX(Math.PI / 3)
	const line = new MeshLine()
	line.setGeometry(new BufferGeometry().setFromPoints([new Vector3(), new Vector3()]))
	const mat = new MeshLineMaterial({ color: 0xFFFFFF, lineWidth: 0.3 })
	const fishingLine = new Mesh(line, mat)
	scene.add(fishingLine)
	const fishingPole = ecs.add({ model: poleModel, fishingLine })
	return fishingPole
}

const playerFishingQuery = ecs.with('fishingPole', 'model', 'position', 'rotation', 'playerAnimator')
const fishingQuery = ecs.with('menuType', 'group').where(e => e.menuType === MenuType.Fishing)
export const stopFishing = (force: boolean = false) => {
	for (const player of playerFishingQuery) {
		if ((menuInputs.get('cancel').justReleased || force) && player.fishingPole.bobber) {
			player.playerAnimator.playClamped('lightAttack', { timeScale: 0.5 })
			const { bobber } = player.fishingPole
			if (bobber) {
				bobber.body?.setBodyType(RigidBodyType.Dynamic, false)
				ecs.reindex(bobber)
				if (force) {
					const fish = assets.items.redSnapper.model.clone()
					fish.scale.setScalar(4)
					fish.position.y -= 3
					fish.rotateX(-Math.PI / 2)
					bobber.model?.add(fish)
				}
				playSound('zapsplat_leisure_fishing_road_swipe_cast_air_whoosh_24610')
				bobber.body?.setLinvel(new Vector3(0, 100, -50).applyQuaternion(player.rotation), true)
				setTimeout(() => {
					ecs.remove(bobber)
					ecs.removeComponent(player.fishingPole, 'bobber')
					player.fishingPole.fishingLine?.removeFromParent()
					ecs.removeComponent(player.fishingPole, 'fishingLine')
					if (force) {
						addItemToPlayer({ name: 'redSnapper', quantity: 1 })
					}
					for (const fishing of fishingQuery) {
						ecs.removeComponent(fishing, 'menuType')
					}
				}, 600)
			}
		}
	}
}
const updateFishingLine = () => {
	for (const fisherman of playerFishingQuery) {
		const fishingPole = fisherman.fishingPole
		const tip = fishingPole.model.getObjectByName('tip')
		const { bobber } = fishingPole
		if (bobber && bobber.position.y <= -3 && bobber.body && !bobber.bobbing) {
			ecs.update(bobber, { bobbing: true })
			bobber.body.setBodyType(RigidBodyType.Fixed, false)
			ecs.reindex(bobber)
			bobber.position.y = -3
			ecs.add({ emitter: fishParticles(), position: bobber.position.clone(), autoDestroy: true })
			playSound(['zapsplat_sport_fishing_sinker_tackle_hit_water_plop_001_13669', 'zapsplat_sport_fishing_sinker_tackle_hit_water_plop_002_13670'])
		}

		if (tip && bobber) {
			const pos1 = getWorldPosition(tip)
			const pos2 = new Vector3()
			const pos3 = bobber.position.clone()
			pos2.lerpVectors(pos1, pos3, 0.5)
			const y = pos1.y - pos3.y
			pos2.y = pos3.y + y / 3
			const points = new CatmullRomCurve3([
				pos1,
				pos2,
				pos3,
			]).getPoints(50)
			if (fishingPole.fishingLine) {
				fishingPole.fishingLine.geometry.setGeometry(new BufferGeometry().setFromPoints(points))
			}
		}
	}
}

const fishingSpotQuery = ecs.with('collider', 'fishingSpot', 'interactionContainer', 'rotation')
const playerQuery = ecs.with('player', 'playerAnimator', 'rotation', 'state')
const useFishingPole = () => {
	for (const spot of fishingSpotQuery) {
		for (const player of playerQuery) {
			if (menuInputs.get('validate').justReleased && fishingQuery.size === 0) {
				player.movementForce?.setScalar(0)
				player.targetMovementForce?.setScalar(0)
				ecs.removeComponent(player, 'fishingPole')
				const fishingPole = fishingPoleBundle()
				ecs.update(player, { fishingPole })
				openMenu(MenuType.Fishing)(spot)

				const rot = spot.rotation.clone().multiply(new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI))
				setTimeout(() => {
					const bobber = ecs.add({
						parent: fishingPole,
						position: getWorldPosition(fishingPole.model.getObjectByName('tip')!),
						model: new Mesh(new SphereGeometry(1), new MeshBasicMaterial({ color: 0xFF0000 })),
						bodyDesc: RigidBodyDesc.dynamic().setLinvel(...new Vector3(0, 100, 30).applyQuaternion(player.rotation).toArray()).setAngularDamping(2),
						rotation: rot,
						colliderDesc: ColliderDesc.ball(1).setSensor(true),
					})
					ecs.update(fishingPole, { bobber })

					playSound('zapsplat_leisure_fishing_road_swipe_cast_air_whoosh_24610')
				}, 500)
				player.playerAnimator.playClamped('lightAttack', { timeScale: 0.5 }).then(() => {
					player.state.next = 'idle'
				})
			}
		}
	}
}
const fishBundle = (parentPos: Vector3) => {
	const model = new Mesh(
		new PlaneGeometry(8, 3),
		new MeshBasicMaterial({ map: assets.textures.fish, depthWrite: false, opacity: 0, transparent: true }),
	)
	model.rotateX(-Math.PI / 2)
	model.rotateZ(Math.PI / 2)
	tweens.add({
		from: model.material.opacity,
		to: 0.5,
		duration: 2000,
		onUpdate: f => model.material.opacity = f,
	})
	const rot = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI * 2 * Math.random())
	const dist = 20
	return inMap({
		targetRotation: rot.clone(),
		rotation: rot,
		position: parentPos.add(new Vector3(between(-dist, dist), 0, between(-dist, dist))).setY(-2),
		model,
		fish: new Timer(between(3000, 5000), true),
		...stateBundle(States.fish, 'wander'),
	})
}
const fishSpawnerQuery = ecs.with('fishSpawner', 'group')
const addFish = () => fishSpawnerQuery.onEntityAdded.subscribe((e) => {
	setTimeout(() => {
		range(0, 5, () => {
			ecs.add(fishBundle(getWorldPosition(e.group)))
		})
	}, 100)
})
const fishQuery = ecs.with('fish', 'position', 'model')
const deSpawnFish = () => {
	for (const spawner of fishSpawnerQuery) {
		for (const fish of fishQuery) {
			if (getWorldPosition(spawner.group).distanceTo(fish.position) > 50) {
				if (fish.model instanceof Mesh && fish.model.material) {
					ecs.removeComponent(fish, 'fish')
					const mat = fish.model.material
					tweens.add({
						destroy: fish,
						from: mat.opacity,
						to: 0,
						duration: 2000,
						onUpdate: f => mat.opacity = f,
						onComplete: () => {
							ecs.add(fishBundle(getWorldPosition(spawner.group)))
						},
					})
				}
			}
		}
	}
}

export const fishingPlugin: Plugin<typeof app> = (app) => {
	app.addSubscribers('game', addFish)
		.onPreUpdate('game', updateFishingLine)
		.onUpdate('game', useFishingPole, () => stopFishing(false), deSpawnFish)
		.onUpdate('game', runIf(() => app.isDisabled('paused'), fishBehavior))
}