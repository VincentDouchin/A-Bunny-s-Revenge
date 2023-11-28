import { Vector3 } from 'three'
import { Faction } from '@/global/entity'
import { assets, ecs, time } from '@/global/init'
import { modelColliderBundle } from '@/lib/models'
import { between, range } from '@/utils/mapFunctions'

export const spawnEnemy = (size: number, amount: number) => {
	const beeModel = assets.characters.Armabee.scene
	beeModel.scale.multiplyScalar(2)
	return () => {
		range(0, amount, () => {
			ecs.add({
				inMap: true,
				...modelColliderBundle(beeModel),
				position: new Vector3(between(-size / 2, size / 2), 0, between(-size / 2, size / 2)),
				faction: Faction.Enemy,
			})
		})
	} }

const entities = ecs.with('faction', 'position', 'rotation', 'body', 'collider')
const enemiesQuery = entities.where(({ faction }) => faction === Faction.Enemy)
const playerQuery = entities.where(({ faction }) => faction === Faction.Player)

export const enemyAttackPlayer = () => {
	for (const enemy of enemiesQuery) {
		for (const player of playerQuery) {
			const direction = player.position.clone().sub(enemy.position).normalize()
			enemy.rotation.setFromUnitVectors(new Vector3(0, 0, 1), new Vector3(direction.x, 0, direction.z))
			const force = 1 * time.delta
			enemy.body.applyImpulse(direction.multiply(new Vector3(force, 0, force)), true)
		}
	}
}