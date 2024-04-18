import type { Tween } from '@tweenjs/tween.js'
import { Group } from '@tweenjs/tween.js'
import { time } from '@/global/init'

export class TweenGroup extends Group {
	add(...tweens: Tween<any>[]) {
		for (const tween of tweens) {
			super.add(tween)
			tween.start(time.elapsed)
		}
	}
}