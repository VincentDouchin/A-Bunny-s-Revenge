import type { With } from 'miniplex'
import { circIn, circOut, createExpoIn } from 'popmotion'
import { between } from 'randomish'
import { Vector3 } from 'three'
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer'
import { ecs, tweens } from '@/global/init'
import type { Entity } from '@/global/entity'

export const spawnDamageNumber = (amount: number, enemy: With<Entity, 'position' | 'size'>, crit: boolean) => {
	const el = document.createElement('div')
	el.textContent = String(Math.round(amount * 10) / 10)
	el.style.color = crit ? 'red' : 'yellow'
	const mesh = new CSS2DObject(el)
	const y = enemy.size.y
	const top = y + between(2, 4)
	const position = enemy.position.clone().add(new Vector3(0, y, 0))
	const damageNumber = ecs.add({ model: mesh, position })
	tweens.async({
		from: y,
		to: top,
		duration: 200,
		onUpdate: f => damageNumber.position.y = f,
		ease: circIn,
	}, {
		from: top,
		to: top - between(2, 4),
		duration: 200,
		ease: circOut,
		onUpdate: f => damageNumber.position.y = f,
	})
	tweens.add({
		from: 4,
		to: 0,
		duration: 400,
		ease: createExpoIn(1),
		onUpdate: f => el.style.fontSize = `${f}em`,
	})
	const origin = enemy.position.clone()
	const direction = new Vector3().randomDirection()
	tweens.add({
		from: 0,
		destroy: damageNumber,
		to: between(2, 5),
		duration: 400,
		onUpdate: (f) => {
			damageNumber.position.x = origin.x + direction.x * f
			damageNumber.position.z = origin.z + direction.z * f
		},
	})
}