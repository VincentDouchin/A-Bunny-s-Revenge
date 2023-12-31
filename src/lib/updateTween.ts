import type { State } from './state'
import { ecs } from '@/global/init'

const tweenQuery = ecs.with('tween')
export const updateTweens = () => {
	for (const { tween } of tweenQuery) {
		tween.update(Date.now())
	}
}

export const startTweens = () => tweenQuery.onEntityAdded.subscribe(({ tween }) => {
	tween.start(Date.now())
})

export const tweenPlugin = (state: State) => {
	state
		.addSubscriber(startTweens)
		.onUpdate(updateTweens)
}