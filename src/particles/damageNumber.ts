import { Easing, Tween } from '@tweenjs/tween.js'
import { between } from 'randomish'
import { Vector3 } from 'three'
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer'
import type { With } from 'miniplex'
import { TweenGroup } from '@/lib/tweenGroup'
import { ecs } from '@/global/init'
import type { Entity } from '@/global/entity'

export const spawnDamageNumber = (amount: number, enemy: With<Entity, 'position' | 'size'>) => {
	const el = document.createElement('div')
	el.textContent = String(Math.round(amount))
	el.style.color = 'red'
	const mesh = new CSS2DObject(el)
	const y = enemy.size.y
	const top = y + between(2, 4)
	const position = enemy.position.clone().add(new Vector3(0, y, 0))
	const down = new Tween([top]).to([y], 200).onUpdate(([val]) => position.y = val).easing(Easing.Circular.In)
	const up = new Tween(position).to({ y: top }, 200).chain(down).easing(Easing.Circular.Out)
	const size = new Tween([7]).to([0]).easing(Easing.Exponential.Out).onUpdate(([val]) => el.style.fontSize = `${val}em`)
	const origin = enemy.position.clone()
	const direction = new Vector3().randomDirection()
	const throwing = new Tween([0]).to([between(2, 5)], 400).onUpdate(([val]) => {
		position.x = origin.x + direction.x * val
		position.z = origin.z + direction.z * val
	})
	const tween = new TweenGroup([throwing, down, up, size])
	const damageNumber = ecs.add({ model: mesh, position, tween })
	throwing.onComplete(() => ecs.remove(damageNumber))
}