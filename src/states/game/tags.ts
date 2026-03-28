import type { app } from '@/global/states'
import type { Plugin, SubscriberSystem } from '@/lib/app'
import type { Direction } from '@/lib/directions'
import { ColliderDesc, RigidBodyDesc } from '@dimforge/rapier3d-compat'
import { Color, DoubleSide, Mesh, MeshPhongMaterial, PointLight, Vector3 } from 'three/webgpu'
import { moveCamera } from '@/global/camera'
import { Interactable } from '@/global/entity'
import { ecs, save } from '@/global/init'
import { cloneMaterials } from '@/lib/colliders'
import { otherDirection } from '@/lib/directions'
import { lockPlayer, unlockPlayer } from '@/utils/dialogHelpers'
import { sleep } from '@/utils/sleep'
import { cropBundle } from '../farm/farming'
import { wateringCanBundle } from '../farm/wateringCan'
import { spawnPlayer } from './spawnPlayer'

const spawnLamp = () => ecs.with('lamp', 'model').onEntityAdded.subscribe((e) => {
	e.model.traverse((node) => {
		if (node.name.includes('light')) {
			const nightLight = new PointLight(0xFFFF00, 1, 100, 0.01)
			node.add(nightLight)
			ecs.add({ parent, nightLight })
		}
		if (node instanceof Mesh && node.material instanceof MeshPhongMaterial) {
			node.material.side = DoubleSide
			if (node.name.includes('bulb')) {
				node.material.emissive = new Color(0xFFFF00)
				ecs.add({ parent, emissiveMat: node.material })
			}
		}
	})
})

const spawnDoorFarm = () => ecs.with('door', 'collider').onEntityAdded.subscribe((e) => {
	e.collider.setSensor(true)
})

const spawnDoorsDungeon: SubscriberSystem<typeof app, 'dungeon'> = resources => ecs.with('doorDungeon', 'position', 'rotation').onEntityAdded.subscribe((e) => {
	ecs.remove(e)
	ecs.add({
		position: e.position.clone(),
		rotation: e.rotation.clone(),
		bodyDesc: RigidBodyDesc.fixed(),
		colliderDesc: ColliderDesc.cuboid(20, 20, 3).setTranslation(0, 10, 0),
		doorDirection: e.doorDungeon as Direction,
		door: 'dungeon',
	})
	if (resources.direction === otherDirection[e.doorDungeon]) {
		const pos = e.position.clone().add(new Vector3(0, 0, 10).applyQuaternion(e.rotation))
		spawnPlayer(pos, e.rotation.clone(), 'SwordWeapon')
		moveCamera(true)()
	}
})

const gardenPlots = () => ecs.with('gardenPlot', 'collider', 'entityId', 'model').onEntityAdded.subscribe((e) => {
	e.collider.setSensor(true)
	cloneMaterials(e.model)
	const crop = save.crops[e.entityId]
	if (crop) {
		ecs.update(e, {
			withChildren: (parent) => {
				const planted = ecs.add({
					parent,
					...cropBundle(false, crop),
				})
				ecs.update(parent, { planted })
			},
		})
	}
})

const well = () => ecs.with('well').onEntityAdded.subscribe((e) => {
	ecs.update(e, {
		interactable: Interactable.FillWateringCan,
		size: new Vector3(0, 5, 0),
		onPrimary(_e, player) {
			const wateringCan = player.wateringCan ?? wateringCanBundle()
			ecs.update(player, { wateringCan })
			lockPlayer()
			wateringCan.waterAmount = 0
			sleep(100).then(() => {
				wateringCan.waterAmount = 1
			})
			sleep(2000).then(unlockPlayer)
		},
	})
})

const doorClearing = () => ecs.with('doorType', 'doorLevel').where(e => e.doorType === 'vine').onEntityAdded.subscribe((e) => {
	ecs.addComponent(e, 'doorLocked', true)
})

export const spawnTagsPlugin: Plugin<typeof app> = (app) => {
	app.addSubscribers('game', spawnLamp, spawnDoorFarm, gardenPlots, well)
		.addSubscribers('dungeon', spawnDoorsDungeon)
		.addSubscribers('clearing', doorClearing)
}
