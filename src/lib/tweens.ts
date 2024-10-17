import type { Entity } from '@/global/entity'
import type { World } from 'miniplex'
import type { AnimationOptions, Driver } from 'popmotion'
import type { Time } from './time'
import { animate } from 'popmotion'

type TweenOptions<V> = AnimationOptions<V> & { parent?: Entity, destroy?: Entity }

export const tweensManager = (time: Time, ecs: World) => {
	const tweens = new Set<(f: number) => void>()
	const driver: Driver = (update: (f: number) => void) => ({
		start: () => tweens.add(update),
		stop: () => tweens.delete(update),
	})
	const tick = () => {
		for (const tween of tweens) {
			tween(time.delta)
		}
	}
	const add = <V = number>(...options: TweenOptions<V>[]) => {
		for (const option of options) {
			if (option.destroy) {
				const complete = option.onComplete
				option.onComplete = () => {
					complete && complete()
					ecs.remove(option.destroy)
				}
			}
			const tween = animate<V>({ ...option, driver })
			if (option.parent) {
				ecs.add({
					parent: option.parent,
					onDestroy() {
						tween.stop()
					},
				})
			}
		}
	}
	const async = async <V = number>(...options: (TweenOptions<V> | (() => TweenOptions<V>))[]) => {
		for (const option of options) {
			await new Promise<void>((resolve) => {
				const opt = typeof option === 'function' ? option() : option
				const complete = opt.onComplete
				add<V>({ ...opt, onComplete: () => {
					resolve()
					complete && complete()
				} })
			})
		}
	}

	return { tick, add, async }
}