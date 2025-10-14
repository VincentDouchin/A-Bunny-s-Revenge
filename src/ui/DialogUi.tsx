import type { Atom } from 'solid-use/atom'
import { createEffect, createMemo, For, onCleanup, onMount, Show } from 'solid-js'
import { Portal } from 'solid-js/web'
import { css } from 'solid-styled'
import atom from 'solid-use/atom'
import { params } from '@/global/context'
import { ecs, ui } from '@/global/init'
import { soundDialog } from '@/lib/dialogSound'
import { OutlineText } from './components/styledComponents'
import { useGame, useQuery } from './store'

interface Letter {
	letter: string
	color: string | null
}

const colorMap: Record<string, string> = {
	blue: '#36c5f4',
	green: '#9de64e',
	gold: '#f3a833',
}

function splitLetters(sentence: string) {
	let color: string | null = null
	const words = sentence.split(' ').map((word) => {
		const letters: Letter[] = []
		const lettersToParse = word.split('')
		for (let i = 0; i < lettersToParse.length; i++) {
			const letter = lettersToParse[i]
			if (letter === '#') {
				const nextPountIndex = lettersToParse.findIndex((l, j) => j > i && l === '#')
				const newColor = lettersToParse.slice(i + 1, nextPountIndex).join('').toLowerCase()
				const colorName = colorMap?.[newColor] ?? newColor
				if (colorName === color) {
					color = null
				} else {
					color = colorName
				}
				i += newColor.length + 1
				continue
			}

			letters.push({ letter, color })
		}
		return letters
	})
	return words
}

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
	const words = createMemo(() => splitLetters(props.text))
	return (
		<For each={words()}>
			{(word, wi) => {
				const length = createMemo(() => words().reduce((acc, v, j) => j < wi() ? acc + v.length : acc, 0))

				return (
					<div class="word">
						<For each={word}>
							{(ch, i) => {
								return <div class={`${(letterVisible() > (i() + 1 + length()) || props.finished()) ? 'letter-visible' : 'letter-hidden'}`} style={{ color: ch.color ?? 'white' }}>{ch.letter}</div>
							}}
						</For>
						<div class="space"></div>
					</div>
				)
			}}
		</For>
	)
}

const dialogQuery = useQuery(ecs.with('dialog'))
const dialogContainerQuery = ecs.with('dialogContainer')
const talkingQuery = useQuery(dialogContainerQuery)
export const DialogUi = () => {
	const context = useGame()!

	css/* css */`
	.dialog-container {
		color: white;
		transform:translateY(-100%);
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
		top: -100%;
		z-index: 1;
	}`
	return (
		<For each={dialogQuery()}>
			{(entity) => {
				const currentDialog = atom<string | null>(null)
				const waiting = atom(false)

				const finished = atom(false)
				const stepDialog = async (force = false) => {
					if (finished() || force) {
						if (waiting()) return
						currentDialog(null)
						waiting(true)
						const next = await entity.dialog.next()
						waiting(false)
						if (next.value) {
							currentDialog(next.value)
						}
						if (next.done) {
							if (entity.npcName) {
								ecs.removeComponent(entity, 'dialog')
							} else {
								ecs.remove(entity)
							}
						}
					} else {
						finished(true)
					}
				}
				onMount(() => {
					stepDialog(true)
				})
				onCleanup(() => {
					for (const entity of dialogContainerQuery) {
						ecs.removeComponent(entity, 'dialogContainer')
					}
				})
				let cancelCurrentDialog: (() => void) | null = null

				ui.updateSync(async () => {
					if (context.player().playerControls.get('primary').justReleased) {
						cancelCurrentDialog && cancelCurrentDialog()
						stepDialog()
					}
				})
				const talking = createMemo(() => talkingQuery()[0])

				return (
					<Show when={talking()}>
						{(talking) => {
							const text = createMemo(() => currentDialog())
							createEffect(() => {
								const dialog = currentDialog()
								const voice = talking().voice
								if (voice && dialog) {
									const { cancel, play } = soundDialog(voice, dialog)
									play()
									cancelCurrentDialog = cancel
								}
							})
							return (
								<Portal mount={talking().dialogContainer.element}>
									<Show when={text()}>
										{(text) => {
											return (
												<>
													<Show when={talking().npcName}>
														<OutlineText>
															<div class="npc-name">{talking().npcName}</div>
														</OutlineText>
													</Show>
													<div class="dialog-container">
														<DialogText text={text()} finished={finished} />
													</div>
												</>
											)
										}}
									</Show>
								</Portal>
							)
						}}
					</Show>
				)
			}}
		</For>
	)
}