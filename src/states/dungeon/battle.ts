import { Tween } from '@tweenjs/tween.js'
import { Mesh } from 'three'
import { Faction } from '@/global/entity'
import { ecs, world } from '@/global/init'

const playerQuery = ecs.with('playerControls', 'sensorCollider', 'position')
const enemiesQuery = ecs.with('collider', 'faction', 'model', 'body', 'position', 'currentHealth').without('tween', 'dying').where(({ faction }) => faction === Faction.Enemy)
export const playerAttack = () => {
	for (const { playerControls, sensorCollider, position } of playerQuery) {
		if (playerControls.get('interact').justPressed) {
			for (const enemy of enemiesQuery) {
				if (world.intersectionPair(sensorCollider, enemy.collider)) {
					// ! damage
					enemy.currentHealth--
					// ! animations
					if (enemy.currentHealth > 0) {
						enemy.animator?.playOnce('HitReact')
					}
					// ! knockback
					const force = position.clone().sub(enemy.position).normalize().multiplyScalar(-50000)
					enemy.body.applyImpulse(force, true)
					// ! damage flash
					const tween = new Tween({ color: 1 })
						.to({ color: 0 }, 200)
						.onComplete(() => ecs.removeComponent(enemy, 'tween'))
					enemy.model.traverse((node) => {
						if (node instanceof Mesh) {
							tween.onUpdate(({ color }) => {
								node.material.shader.uniforms.colorAdd.value.r = color
							})
						}
					})
					ecs.update(enemy, { tween })
				}
			}
		}
	}
}