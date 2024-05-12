import type { With } from 'miniplex'
import { For, Show, createEffect, createMemo, onCleanup, onMount } from 'solid-js'
import { Portal } from 'solid-js/web'
import { css } from 'solid-styled'
import type { Atom } from 'solid-use/atom'
import atom from 'solid-use/atom'
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer'
import { Quaternion, Vector3 } from 'three'
import { ForQuery } from './components/ForQuery'
import { ecs, ui } from '@/global/init'
import type { Entity } from '@/global/entity'
import { params } from '@/global/context'

export const DialogText = (props: { text: string, finished: Atom<boolean> }) => {
	css/* css */`
	@keyframes letter-pop {
		from {
			transform: scale(1.5);
		}
		to {
			transform: scale(1);
		}
	}

	.letter-visible {
		animation-name: letter-pop;
		animation-duration: 0.1s;
		animation-fill-mode: forwards;
	}

	.letter-hidden {
		opacity: 0;
	}
	.space {
		width: 0.5rem;
	}
	.word{
		display: flex
	}
	`
	const letterVisible = atom(0)
	createEffect((val) => {
		if (props.text !== val) {
			letterVisible(0)
			props.finished(false)
		}
		return props.text
	})
	onMount(() => {
		const interval = setInterval(() => {
			letterVisible(letterVisible() + 1)
			if (letterVisible() >= props.text.split('').length) {
				props.finished(true)
			}
		}, 20 * params.dialogSpeed)
		onCleanup(() => {
			clearInterval(interval)
		})
	})
	const words = createMemo(() => props.text.split(' '))
	return (
		<For each={words()}>
			{(word, wi) => {
				const length = createMemo(() => words().reduce((acc, v, j) => j < wi() ? acc + v.split('').length : acc, 0))

				return (
					<div class="word">
						<For each={word.split('')}>
							{(ch, i) => {
								return <div class={`${(letterVisible() > (i() + 1 + length()) || props.finished()) ? 'letter-visible' : 'letter-hidden'}`}>{ch}</div>
							}}
						</For>
						<div class="space"></div>
					</div>
				)
			}}
		</For>
	)
}

const dialogQuery = ecs.with('dialog', 'activeDialog')
export const DialogUi = ({ player }: { player: With<Entity, 'playerControls' | 'position'> }) => {
	css/* css */`
	.dialog-container {
		color: white;
		font-family: NanoPlus;
		font-size: 2rem;
		background: hsl(0, 0%, 0%, 50%);
		border-radius: 1rem;
		padding: 1rem;
		display: flex;
		max-width: 15rem;
		flex-wrap:wrap;
		min-width: 20rem;
	}
	.npc-name{
		color: white;
		position: absolute;
		translate: 1rem -50%;
		font-family: NanoPlus;
		font-size: 1.5rem;
	}
`
	return (
		<ForQuery query={dialogQuery}>
			{(entity) => {
				const currentDialog = atom<IteratorResult<string | string[] | void | false> | null>(null)
				const element = atom<HTMLElement | null>(null)
				const finished = atom(false)
				onMount(() => {
					if (entity.targetRotation && entity.position && entity.kayAnimator?.current === 'Idle') {
						const rot = player.position.clone().sub(entity.position)
						const angle = Math.atan2(rot.x, rot.z)
						entity.targetRotation.copy(new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), angle))
					}
				})
				ui.updateSync(async () => {
					if (player.playerControls.get('primary').justReleased) {
						if (!entity.dialogContainer) {
							const dialogContainer = new CSS2DObject(document.createElement('div'))
							dialogContainer.position.y = entity.dialogHeight ?? entity.size?.y ?? 4
							element(dialogContainer.element)
							ecs.update(entity, { dialogContainer })
							currentDialog(await entity.dialog.next())
						} else {
							if (finished()) {
								currentDialog(await entity.dialog.next())
								if (!currentDialog()?.value || currentDialog()?.done) {
									ecs.removeComponent(entity, 'dialogContainer')
									ecs.removeComponent(entity, 'activeDialog')
								}
							} else {
								finished(true)
							}
						}
					}
				})

				return (
					<Show when={currentDialog()?.value ? element() : false}>
						{(el) => {
							const text = ui.sync(() => currentDialog()?.value || '')
							onCleanup(() => {
								currentDialog(null)
								element(null)
							})
							return (
								<Portal mount={el()}>
									<Show when={entity.npcName}>
										<div class="npc-name">{entity.npcName}</div>
									</Show>
									<div class="dialog-container">
										<DialogText text={text()} finished={finished} />
									</div>
								</Portal>
							)
						}}
					</Show>
				)
			}}
		</ForQuery>
	)
}