import { Mesh, MeshPhongMaterial, Vector3 } from 'three'
import { itemBundle } from '../game/items'
import { ecs, world } from '@/global/init'
import { sleep } from '@/utils/sleep'

const dropBerries = async (amount: number, bushPosition: Vector3) => {
	for (let i = 0; i < amount; i++) {
		const position = new Vector3().randomDirection().multiplyScalar(3).add(bushPosition)
		position.y = Math.abs(position.y)
		const angle = Math.random() * Math.PI * 2

		const popDirection = new Vector3(Math.cos(angle) * 2, 3, Math.sin(angle) * 2)
		popDirection.y = Math.abs(popDirection.y)
		ecs.add({
			...itemBundle('strawberry'),
			position,
			popDirection,
		})
		await sleep(50)
	}
}

const playerQuery = ecs.with('player', 'playerControls', 'sensorCollider')
const bushesQuery = ecs.with('berries', 'collider', 'model', 'position')
export const dropBerriesOnHit = () => {
	for (const player of playerQuery) {
		if (player.playerControls.get('primary').justReleased) {
			for (const bush of bushesQuery) {
				if (world.intersectionPair(player.sensorCollider, bush.collider)) {
					const berries = bush.model.getObjectByName('Sphere001')
					if (berries instanceof Mesh && berries.material instanceof MeshPhongMaterial) {
						berries.material.opacity = 0
						berries.material.transparent = true
						dropBerries(5, bush.position)
					}
				}
			}
		}
	}
}
