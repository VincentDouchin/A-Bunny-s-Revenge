import type { Tween } from '@tweenjs/tween.js'

export class TweenGroup extends Set<Tween<any>> {
	start(time: number) {
		for (const tween of this) {
			tween.start(time)
		}
	}

	update(time: number) {
		for (const tween of this) {
			tween.update(time)
		}
	}
}