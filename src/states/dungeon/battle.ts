import { Tween } from '@tweenjs/tween.js'
import type { With } from 'miniplex'
import { between } from 'randomish'
import { Mesh, Vector3 } from 'three'
import { itemBundle } from '../game/items'
import { spawnAcorns } from './acorn'
import { CharacterMaterial } from '@/shaders/materials'
import { ecs, gameTweens, time } from '@/global/init'
import { Faction } from '@/global/entity'
import type { Entity } from '@/global/entity'
import { lootPool } from '@/constants/enemies'

export const flash = (entity: With<Entity, 'model'>, duration: number, damage: boolean) => {
	const tween = new Tween({ flash: 0 })
		.to({ flash: 1 }, duration)
		.yoyo(true)
		.repeat(1)
	tween.onUpdate(({ flash }) => {
		entity.model.traverse((node) => {
			if (node instanceof Mesh && node.material instanceof CharacterMaterial) {
				node.material.uniforms.flash.value = flash
				if (damage) {
					node.material.uniforms.flashColor.value = new Vector3(1, 1 - flash, 1 - flash)
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
const entities = ecs.with('faction', 'position', 'rotation', 'body', 'collider', 'movementForce', 'state', 'sensorCollider', 'currentHealth', 'model', 'size', 'group')

const playerQuery = entities.with('playerControls', 'strength', 'body', 'critChance', 'critDamage', 'speed', 'state', 'combo', 'playerAnimator', 'weapon', 'lootQuantity', 'lootChance').where(({ faction }) => faction === Faction.Player)

export const spawnDrops = () => ecs.with('drops', 'position').onEntityRemoved.subscribe((e) => {
	const player = playerQuery.first
	if (player) {
		spawnAcorns(between(2, 5), e.position)
		for (const drop of lootPool(player.lootQuantity.value, player.lootChance.value, e.drops)) {
			ecs.add({ ...itemBundle(drop.name), position: e.position.clone().add(new Vector3(0, 5, 0)) })
		}
	}
})

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