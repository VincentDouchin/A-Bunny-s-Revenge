import type { AnimationAction, AnimationBlendMode, AnimationClip, Object3D, Object3DEventMap } from 'three'
import { entries } from '@/utils/mapFunctions'
import { AnimationMixer, LoopOnce } from 'three'

interface playOptions { timeScale?: number, weight?: number, clamped?: boolean, loopOnce?: boolean, blending?: AnimationBlendMode }
export class Animator<K extends string> extends AnimationMixer {
	current?: K
	action?: AnimationAction
	animationClips: Record<K, AnimationClip>
	delay: number = 0
	constructor(scene: Object3D<Object3DEventMap>, animations: AnimationClip[], animationMap?: Record<K, string>) {
		super(scene)
		const clips = {} as Record<K, AnimationClip>
		if (animationMap) {
			for (const [animationName, clipName] of entries(animationMap)) {
				const correspondingClip = animations.find(clip => clip.name === clipName)
				if (correspondingClip) {
					clips[animationName] = correspondingClip
				}
			}
		} else {
			for (const clip of animations) {
				clips[clip.name as K] = clip
			}
		}
		this.animationClips = clips
	}

	#getClip(animation: K) {
		const clip = this.animationClips[animation]
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

	getTimeRatio() {
		if (this.action) {
			return this.action.time / (this.action.getClip().duration / this.action.timeScale - this.delay)
		} else {
			return 0
		}
	}

	play(animation: K, options?: playOptions) {
		const action = this.#getAction(animation)!

		if (this.action) {
			this.action?.crossFadeTo(action, 0.1, true)
		}
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
			if (options.blending) {
				action.blendMode = options.blending
			}
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

	playOnce(animation: K, options?: playOptions, delay = 0) {
		const clip = this.#getClip(animation)
		this.delay = delay
		this.play(animation, { ...options, loopOnce: true })
		return new Promise<void>((resolve) => {
			setTimeout(() => {
				this.delay = 0
				resolve()
			}, (clip.duration / (options?.timeScale ?? 1) - delay) * 1000)
		})
	}

	playClamped(animation: K, options?: playOptions) {
		return this.play(animation, { ...options, loopOnce: true, clamped: true })
	}

	playAnimation(animation: K, options?: playOptions) {
		if (animation !== this.current) {
			this.play(animation, options)
		}
	}
}
