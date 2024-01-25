import { Tween } from '@tweenjs/tween.js'
import { Mesh } from 'three'
import type { Entity } from '@/global/entity'
import { ecs } from '@/global/init'
import { Stat } from '@/lib/stats'
import { ToonMaterial } from '@/shaders/GroundShader'

export const healthBundle = (health: number) => ({
	currentHealth: health,
	maxHealth: new Stat(health),
} as const satisfies Entity)

const healthQuery = ecs.with('currentHealth', 'maxHealth', 'stateMachine')
export const killEntities = () => {
	for (const entity of healthQuery) {
		if (entity.currentHealth <= 0) {
			entity.stateMachine.enter('dying', entity)
		}
	}
}
const deadEntities = ecs.with('state', 'body', 'movementForce', 'model').where(e => e.state === 'dead')
export const killAnimation = () => deadEntities.onEntityAdded.subscribe((e) => {
	ecs.removeComponent(e, 'body')
	const tween = new Tween([1]).to([0])
	e.model.traverse((node) => {
		if (node instanceof Mesh) {
			node.castShadow = false
			const mat = node.material as InstanceType<typeof ToonMaterial>
			if (mat instanceof ToonMaterial) {
				mat.transparent = true
				mat.depthWrite = false
				tween.onUpdate(([val]) => mat.opacity = val)
			}
		}
	})
	tween.onComplete(() => ecs.remove(e))
	ecs.update(e, { tween })
})
