import { update } from '@tweenjs/tween.js'
import type { Tween } from '@tweenjs/tween.js'

import type { State } from './state'
import { ecs, time } from '@/global/init'
import type { Entity } from '@/global/entity'

const tweenQuery = ecs.with('tween')
const updateTweens = () => {
	update(time.elapsed)
}

const startTweens = () => tweenQuery.onEntityAdded.subscribe((entity) => {
	entity.tween.start(time.elapsed)
	if (entity.autoDestroy) {
		entity.tween.onStop(() => ecs.remove(entity))
	}
})
const endTweens = () => tweenQuery.onEntityRemoved.subscribe((entity) => {
	entity.tween.stop()
})

export const tweenPlugin = (state: State) => {
	state
		.addSubscriber(startTweens, endTweens)
		.onUpdate(updateTweens)
}

export const addTweenTo = (entity: Entity) => (...tweens: Tween<any>[]) => {
	for (const tween of tweens) {
		ecs.add({
			parent: entity,
			tween,
			autoDestroy: true,
		})
	}
}