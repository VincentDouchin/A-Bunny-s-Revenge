import type { Entity } from '@/global/entity'
import type { With } from 'miniplex'
import { ecs, time, tweens } from '@/global/init'
import { CharacterMaterial } from '@/shaders/materials'
import { circIn } from 'popmotion'
import { Color, Mesh, Vector3 } from 'three'

export const flash = (entity: With<Entity, 'model'>, duration: number, type: 'preparing' | 'damage' | 'poisoned' = 'preparing') => {
	return tweens.async({
		from: 0,
		to: 1,
		repeat: 1,
		repeatType: 'reverse',
		duration,
		onUpdate: (f) => {
			entity.model.traverse((node) => {
				if (node instanceof Mesh && node.material instanceof CharacterMaterial) {
					node.material.uniforms.flash.value = f
					if (type === 'preparing') {
						node.material.uniforms.flashColor.value = new Vector3(1, 1, 1)
					}
					if (type === 'damage') {
						node.material.uniforms.flashColor.value = new Vector3(1, 0, 0)
					}
					if (type === 'poisoned') {
						node.material.uniforms.flashColor.value = new Vector3(...new Color(0x9DE64E).toArray())
					}
				}
			})
		},
	})
}
export const squish = (entity: With<Entity, 'group'>) => {
	const originalScale = entity.group.scale.clone()
	tweens.add({
		from: originalScale,
		to: new Vector3(0.8, 1.5, 0.8),
		duration: 300,
		ease: circIn,
		repeat: 1,
		repeatType: 'reverse',
		onUpdate: f => entity.group.scale.copy(f),
	})
}

export const calculateDamage = (entity: With<Entity, 'strength' | 'critChance' | 'critDamage' | 'playerAttackStyle'>) => {
	let damage = entity.strength.value
	if (entity.playerAttackStyle.lastAttack === 1) {
		damage *= 1.2
	}
	if (entity.playerAttackStyle.lastAttack === 2) {
		damage *= 1.5
	}
	const isCrit = Math.random() < entity.critChance.value
	if (isCrit) {
		damage += entity.strength.value * entity.critDamage.value
	}
	return [damage, isCrit] as const
}

const hitTimerQuery = ecs.with('hitTimer')

export const tickHitCooldown = () => {
	for (const entity of hitTimerQuery) {
		entity.hitTimer.tick(time.delta)
	}
}

const deathTimedQuery = ecs.with('deathTimer')
export const applyDeathTimer = () => {
	for (const entity of deathTimedQuery) {
		entity.deathTimer.tick(time.delta)
		if (entity.deathTimer.finished()) {
			ecs.remove(entity)
		}
	}
}