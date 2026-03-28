import type { With } from 'miniplex'
import type { Entity } from '@/global/entity'
import { circIn } from 'popmotion'
import { Color, Mesh, Vector3 } from 'three/webgpu'
import { ecs, time, tweens } from '@/global/init'
import { CharacterMaterial } from '@/shaders/characterMaterial'

export const flash = (entity: With<Entity, 'model'>, duration: number, type: 'preparing' | 'damage' | 'poisoned' = 'preparing') => {
	return tweens.async({
		from: 1,
		to: 0,
		// repeat: 1,
		// repeatType: 'reverse',
		duration,
		onUpdate: (f) => {
			entity.model.traverse((node) => {
				if (node instanceof Mesh && node.material instanceof CharacterMaterial) {
					node.material.flash.value = f
					if (type === 'preparing') {
						node.material.flashColor.value = new Color(0xFFFFFF)
					} else if (type === 'damage') {
						node.material.flashColor.value = new Color(0xFF0000)
					} else if (type === 'poisoned') {
						node.material.flashColor.value = new Color(0x9DE64E)
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