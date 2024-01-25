import { Tween } from '@tweenjs/tween.js'
import { Vector3 } from 'three'
import { itemBundle } from '../game/items'
import { Faction } from '@/global/entity'
import { ecs, world } from '@/global/init'
import { spawnDamageNumber } from '@/particles/damageNumber'
import { impact } from '@/particles/impact'

const playerQuery = ecs.with('playerControls', 'sensorCollider', 'position', 'strength')
const enemiesQuery = ecs.with('collider', 'faction', 'model', 'body', 'position', 'currentHealth', 'size', 'stateMachine').without('tween').where(({ faction }) => faction === Faction.Enemy)
export const playerAttack = () => {
	for (const { playerControls, sensorCollider, position, strength } of playerQuery) {
		if (playerControls.get('primary').justPressed) {
			for (const enemy of enemiesQuery) {
				if (world.intersectionPair(sensorCollider, enemy.collider)) {
					if (enemy.stateMachine.enter('hit', enemy)) {
						// ! damage
						enemy.currentHealth -= strength.value
						const emitter = impact().emitter
						emitter.position.y = 5
						ecs.update(enemy, { emitter })

						spawnDamageNumber(strength.value, enemy)
						// ! knockback
						const force = position.clone().sub(enemy.position).normalize().multiplyScalar(-50000)
						enemy.body.applyImpulse(force, true)
						// ! damage flash
						const tween = new Tween({ color: 1 })
							.to({ color: 0 }, 200)
							.onComplete(() => ecs.removeComponent(enemy, 'tween'))
						ecs.update(enemy, { tween })
					}
				}
			}
		}
	}
}
export const spawnDrops = () => ecs.with('drops', 'position').onEntityRemoved.subscribe((e) => {
	for (const drop of e.drops) {
		for (let i = 0; i < drop.quantity(); i++) {
			ecs.add({ ...itemBundle(drop.item), position: e.position.clone().add(new Vector3(0, 5, 0)) })
		}
	}
})