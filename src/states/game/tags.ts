import type { app } from '@/global/states'
import type { Plugin, SubscriberSystem } from '@/lib/app'
import type { Direction } from '@/lib/directions'
import { ColliderDesc, RigidBodyDesc } from '@dimforge/rapier3d-compat'
import { Color, DoubleSide, Mesh, MeshPhongMaterial, PointLight, Vector3 } from 'three'
import { moveCamera } from '@/global/camera'
import { ecs } from '@/global/init'
import { otherDirection } from '@/lib/directions'
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

export const spawnTagsPlugin: Plugin<typeof app> = (app) => {
	app.addSubscribers('game', spawnLamp, spawnDoorFarm)
		.addSubscribers('dungeon', spawnDoorsDungeon)
}