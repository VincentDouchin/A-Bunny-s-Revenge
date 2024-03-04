import type { AnimationAction, AnimationClip, Object3D, Object3DEventMap } from 'three'
import { AnimationMixer, LoopOnce } from 'three'

interface playOptions { timeScale?: number, weight?: number, clamped?: boolean, loopOnce?: boolean }
export class Animator<K extends string> extends AnimationMixer {
	current?: K
	action?: AnimationAction
	#animationClips: AnimationClip[]
	animationQueue: AnimationClip[] = []
	constructor(scene: Object3D<Object3DEventMap>, animations: AnimationClip[]) {
		super(scene)
		this.#animationClips = animations
	}

	#getClip(animation: K) {
		const clip = this.#animationClips.find(clip => clip.name === animation)
		if (!clip) {
			throw new Error(`clip ${animation} not found`)
		}
		return clip
	}

	#getAction(animation: K) {
		const clip = this.#getClip(animation)
		if (clip) {
			const action = this.clipAction(clip)
			action.reset()
			return action
		}
	}

	play(animation: K, options?: playOptions) {
		const action = this.#getAction(animation)!
		if (options) {
			if (options.timeScale) {
				action.setEffectiveTimeScale(options.timeScale)
			}
			if (options.clamped === true) {
				action.clampWhenFinished = true
			}
			if (options.loopOnce === true) {
				action.setLoop(LoopOnce, 1)
			}
		}
		if (this.action) {
			this.action?.crossFadeTo(action, 0.1, true)
		}

		action.play()
		this.action = action
		this.current = animation
		return new Promise<void>((resolve) => {
			const finishListener = () => {
				resolve()
				this.removeEventListener('finished', finishListener)
			}
			this.addEventListener('finished', finishListener)
		})
	}

	playOnce(animation: K, options?: playOptions, delay = 0.1) {
		const clip = this.#getClip(animation)
		this.play(animation, { ...options, loopOnce: true })
		return new Promise<void>((resolve) => {
			setTimeout(resolve, (clip.duration / (options?.timeScale ?? 1) - delay) * 1000)
		})
	}

	playClamped(animation: K, options?: playOptions) {
		this.play(animation, { ...options, loopOnce: true, clamped: true })
		return new Promise<void>((resolve) => {
			const finishListener = () => {
				resolve()
				this.removeEventListener('finished', finishListener)
			}
			this.addEventListener('finished', finishListener)
		})
	}

	playAnimation(animation: K) {
		if (animation !== this.current) {
			this.play(animation)
		}
	}
}
