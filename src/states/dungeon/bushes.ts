import type { BufferGeometry, Mesh, MeshPhongMaterial } from 'three'
import { Vector3 } from 'three'
import { itemBundle } from '../game/items'
import { getIntersections } from '../game/sensor'
import { shakenLeaves } from '@/particles/bushShaken'
import { ecs, tweens } from '@/global/init'

const dropBerries = (amount: number, bushPosition: Vector3, berries: Set<Mesh<BufferGeometry, MeshPhongMaterial>>) => {
	for (let i = 0; i < amount; i++) {
		const [berry] = berries
		berries.delete(berry)
		berry.material.transparent = true
		berry.material.opacity = 0
	}
	const position = new Vector3().randomDirection().multiplyScalar(3).add(bushPosition)
	position.y = Math.abs(position.y + 5)
	const angle = Math.random() * Math.PI * 2

	const popDirection = new Vector3(Math.cos(angle) * 2, 3, Math.sin(angle) * 2)
	popDirection.y = Math.abs(popDirection.y)
	ecs.add({
		...itemBundle('strawberry'),
		position,
		popDirection,
	})
}

const playerQuery = ecs.with('player', 'playerControls', 'sensor', 'position', 'rotation')
const berryBushesQuery = ecs.with('berries', 'collider', 'model', 'position')
const bushesQuery = ecs.with('bush', 'collider')
export const dropBerriesOnHit = () => {
	for (const player of playerQuery) {
		if (player.playerControls.get('primary').justReleased) {
			for (const bush of berryBushesQuery) {
				if (getIntersections(player, undefined, c => c === bush.collider)) {
					dropBerries(5, bush.position, bush.berries)
					if (bush.berries.size === 0) {
						ecs.removeComponent(bush, 'berries')
						bush.collider.setSensor(true)
					}
				}
			}
			for (const bush of bushesQuery) {
				if (player.weapon) {
					ecs.update(bush, { shake: 5 })
					if (getIntersections(player, undefined, c => c === bush.collider)) {
						if (bush.shaken !== undefined) {
							bush.shaken += 1
						} else {
							ecs.update(bush, { shaken: 0 })
						}
						ecs.add({
							parent: bush,
							autoDestroy: true,
							position: new Vector3(),
							emitter: shakenLeaves(),
						})
						tweens.add({
							from: 0,
							to: 1,
							duration: 500,
							onUpdate: f => bush.shake = Math.sin(f * 10) * f,
							onComplete: () => {
								if (bush.shaken === 2) {
									ecs.remove(bush)
								} else {
									ecs.removeComponent(bush, 'shake')
								}
							},
						})
					}
				}
			}
		}
	}
}
