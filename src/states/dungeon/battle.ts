import { Tween } from '@tweenjs/tween.js'
import type { With } from 'miniplex'
import { Color, Mesh, Vector3 } from 'three'
import type { Entity } from '@/global/entity'
import { ecs, gameTweens, time } from '@/global/init'
import { CharacterMaterial } from '@/shaders/materials'

export const flash = (entity: With<Entity, 'model'>, duration: number, type: 'preparing' | 'damage' | 'poisoned' = 'preparing') => {
	const tween = new Tween({ flash: 0 })
		.to({ flash: 1 }, duration)
		.yoyo(true)
		.repeat(1)
	tween.onUpdate(({ flash }) => {
		entity.model.traverse((node) => {
			if (node instanceof Mesh && node.material instanceof CharacterMaterial) {
				node.material.uniforms.flash.value = flash
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
	})
	gameTweens.add(tween)
	return tween
}

export const calculateDamage = (entity: With<Entity, 'strength' | 'critChance' | 'critDamage' | 'combo'>) => {
	let damage = entity.strength.value
	if (entity.combo.lastAttack === 1) {
		damage *= 1.2
	}
	if (entity.combo.lastAttack === 2) {
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