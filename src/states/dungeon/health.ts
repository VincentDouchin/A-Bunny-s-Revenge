import { Tween } from '@tweenjs/tween.js'
import { Material, Mesh } from 'three'
import { type Entity, Faction } from '@/global/entity'
import { ecs, gameTweens } from '@/global/init'
import { Stat } from '@/lib/stats'
import { enemyDefeated } from '@/particles/enemyDefeated'
import type { ToonMaterial } from '@/shaders/materials'

export const healthBundle = (health: number, current?: number) => ({
	currentHealth: current ?? health,
	maxHealth: new Stat(health),
} as const satisfies Entity)

const healthQuery = ecs.with('currentHealth', 'maxHealth', 'state')
export const killEntities = () => {
	for (const entity of healthQuery) {
		if (entity.currentHealth <= 0 && entity.state !== 'dying' && entity.state !== 'dead') {
			ecs.update(entity, { state: 'dying' })
		}
	}
}
export const setInitialHealth = () => {
	for (const entity of healthQuery) {
		entity.currentHealth = entity.maxHealth.value
	}
}

const deadEntities = ecs.with('state', 'body', 'movementForce', 'model', 'faction').where(e => e.state === 'dead')
export const killAnimation = () => deadEntities.onEntityAdded.subscribe((e) => {
	ecs.removeComponent(e, 'body')
	const tween = new Tween([1]).to([0])
	if (e.faction === Faction.Enemy) {
		ecs.add({
			position: e.position?.clone(),
			emitter: enemyDefeated(),
			autoDestroy: true,
		})
		e.model.traverse((node) => {
			if (node instanceof Mesh) {
				node.castShadow = false
				const mat = node.material as InstanceType<typeof ToonMaterial>
				if (mat instanceof Material) {
					mat.transparent = true
					mat.depthWrite = false
					tween.onUpdate(([val]) => mat.opacity = val)
				}
			}
		})
	}
	tween.onComplete(() => ecs.remove(e))
	gameTweens.add(tween)
})
