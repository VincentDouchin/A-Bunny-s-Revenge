import type { With } from 'miniplex'
import { For, Show, createEffect, createSignal, onCleanup } from 'solid-js'
import { Portal } from 'solid-js/web'
import { css } from 'solid-styled'
import atom from 'solid-use/atom'
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer'
import { ForQuery } from './components/ForQuery'
import { ecs, ui } from '@/global/init'
import type { Entity } from '@/global/entity'
import { params } from '@/global/context'

export const DialogText = (props: { text: string }) => {
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
	`
	let now = Date.now()
	const [time, setTime] = createSignal(0)
	const cleanUpTimeout = setInterval(() => {
		setTime(Math.floor((Date.now() - now) / 20 * params.dialogSpeed))
	})
	createEffect((val) => {
		if (props.text !== val) {
			setTime(0)
			now = Date.now()
		}
		return props.text
	})
	onCleanup(() => clearInterval(cleanUpTimeout))

	return (
		<For each={props.text.split('')}>
			{(ch, i) => {
				return <div class={`${time() >= i() ? 'letter-visible' : 'letter-hidden'} letter ${ch === ' ' ? 'space' : ''}`}>{ch}</div>
			}}
		</For>
	)
}

const dialogQuery = ecs.with('dialog', 'activeDialog')
export const DialogUi = ({ player }: { player: With<Entity, 'playerControls'> }) => {
	css/* css */`
	.dialog-container {
		color: white;
		font-family: NanoPlus;
		font-size: 2rem;
		background: hsl(0, 0%, 0%, 50%);
		border-radius: 1rem;
		padding: 1rem;
		display: flex;
		min-width: 15rem;
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
				ui.updateSync(() => {
					if (player.playerControls.get('primary').justReleased) {
						if (!entity.dialogContainer) {
							const dialogContainer = new CSS2DObject(document.createElement('div'))
							dialogContainer.position.y = entity.dialogHeight ?? entity.size?.y ?? 4
							element(dialogContainer.element)
							ecs.update(entity, { dialogContainer })
						}
						currentDialog(entity.dialog.next())
						if (!currentDialog()?.value || currentDialog()?.done) {
							ecs.removeComponent(entity, 'dialogContainer')
							ecs.removeComponent(entity, 'activeDialog')
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
										<DialogText text={text()} />
									</div>
								</Portal>
							)
						}}
					</Show>
				)
			}}
		</ForQuery>
	)
	// const dialogs = ui.sync(() => [...dialogQuery])
	// const input = playerInputMap().playerControls.get('primary')
	// return (
	// 	<For each={dialogs()}>
	// 		{ (entity) => {
	// 			const dialog = ui.sync(() => entity.currentDialog)
	// 			return (
	// 				<Portal mount={entity.dialogContainer.element}>
	//
	// 					<div style={{ 'position': 'absolute', 'right': 0, 'translate': '-1rem -50%', 'display': 'flex', 'color': 'white', 'gap': '0.5rem', 'font-size': '1.5rem', 'align-items': 'center' }}>
	// 						<InputIcon input={input}></InputIcon>
	// 						<div>Continue</div>
	// 					</div>
	// 				</Portal>
	// 			)
	// 		}}
	// 	</For>
	// )
}