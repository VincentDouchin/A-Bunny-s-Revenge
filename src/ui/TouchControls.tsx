import type { TouchController } from '@/lib/inputs'
import type { Accessor, JSX, JSXElement } from 'solid-js'
import type { Vec2 } from 'three'
import { ecs } from '@/global/init'
import { atom } from '@/lib/uiManager'
import Inventory from '@assets/icons/basket-shopping-solid.svg'
import Lock from '@assets/icons/lockIndicator.svg'
import Pause from '@assets/icons/pause-solid.svg'
import { createMemo, onCleanup, Show } from 'solid-js'
import { css } from 'solid-styled'
import { Transition } from 'solid-transition-group'
import { Vector2 } from 'three'
import { StateUi } from './components/StateUi'
import { OutlineText } from './components/styledComponents'
import { getInteractables } from './Interactions'
import { useGame, useQuery } from './store'

export const TouchButton = <T extends string,>({ input, controller, children, interactable, size, distance, angle, text }: {
	input: T
	controller: TouchController<T>
	children?: JSXElement
	interactable?: Accessor<{ text: string, icon?: JSX.Element } | undefined>
	text?: string
	size: string
	distance?: string
	angle?: string
}) => {
	const isPressed = createMemo(() => controller?.get(input))
	const interact = (value: number) => () => {
		controller.set(input, value)
	}
	const textToDisplay = createMemo(() => text ?? (interactable && interactable()?.text))
	css/* css */`
	.input{
		top:calc((cos(var(--angle)) * -1 * var(--distance)) + 50%);
		left:calc((sin(var(--angle)) * -1 * var(--distance)) + 50%);
		--angle: ${angle ?? '0deg'};
		--distance: ${distance ?? '0'};
		--input-size:${size};
		--pressed:${isPressed() ? '0rem' : '1rem'};
		transition: all 0.1s ease-in-out;
		transform:translate(-50%, calc(-50% + 1rem - var(--pressed)));
		width: var(--input-size);
		height: var(--input-size);
		border-radius: var(--input-size);
		position: absolute;
		display: grid;
		place-items: center;
		font-size: calc(0.6 * var(--input-size));
		fill: white;
		background: var(--gold);
		box-shadow: inset 0.5rem 0.5rem 0 0 var(--gold-shiny), 0 var(--pressed) 0 0 black;
		opacity: var(--ui-opacity);
	}
	:global(.input svg) {
		filter:
			drop-shadow(-0.1rem -0.1rem 0rem black)
			drop-shadow(0.2rem -0.1rem 0rem black)
			drop-shadow(0.2rem 0.2rem 0rem black)
			drop-shadow(-0.1rem 0.2rem 0rem black);
	}
	.input-text{
		position: absolute;
		color: white;
		bottom: 0%;
		font-size: calc(var(--input-size) * 0.25);
		white-space: nowrap;
	}
	.inputs-container{
		position: fixed;
		bottom: 10rem;
		right: 15rem;
	}
	.inputs-center{
		position:relative
	}
	`
	const icon = createMemo(() => children ?? (interactable && interactable()?.icon))
	onCleanup(interact(0))
	return (
		<div class="inputs-container">
			<div class="inputs-center">
				<div
					class="input"
					onTouchStart={interact(1)}
					onTouchEnd={interact(0)}
					onTouchCancel={interact(0)}
				>
					<Transition name="popup" mode="outin">
						<Show when={icon()}>
							{icon => icon()}
						</Show>
					</Transition>
					<Transition name="popup" mode="outin">
						<Show when={textToDisplay()}>
							{(text) => {
								return (
									<div class="input-text">
										<OutlineText>{text()}</OutlineText>
									</div>
								)
							}}
						</Show>
					</Transition>

				</div>
			</div>
		</div>
	)
}

export const TouchControls = () => {
	const context = useGame()
	const interactableQuery = useQuery(ecs.with('interactable', 'interactionContainer'))
	return (
		<Show when={context?.showTouch() && context?.player()}>
			{(player) => {
				const playerInputs = player().playerControls.touchController
				const pixelOffset = atom(new Vector2(0, 0))
				const centerPostion = createMemo(() => `translate(calc(-50% + ${pixelOffset().x}px),calc(-50% + ${pixelOffset().y}px) )`)
				const container = atom<null | HTMLDivElement>(null)
				const isJoystickPressed = atom(false)
				const initialPos = atom<null | Vec2>(null)
				const moveCenter = (e: TouchEvent) => {
					isJoystickPressed(true)
					const cont = container()
					if (cont) {
						const containerBoundingBox = cont.getBoundingClientRect()
						const center = new Vector2(
							containerBoundingBox.left + containerBoundingBox.width / 2,
							containerBoundingBox.top + containerBoundingBox.height / 2,
						)
						const touch = e.targetTouches[0]
						const max = containerBoundingBox.width / 2
						if (touch) {
							const newPos = new Vector2(touch.clientX - center.x, touch.clientY - center.y)
							if (newPos.length() >= max) {
								newPos.clampLength(max, max)
							}
							pixelOffset(newPos)
							const input = newPos.clone().normalize().multiplyScalar(newPos.length() / max)
							const touchController = playerInputs
							if (touchController) {
								touchController.set('left', input.x < 0 ? -input.x : 0)
								touchController.set('right', input.x > 0 ? input.x : 0)
								touchController.set('forward', input.x > 0 ? -input.y : 0)
								touchController.set('backward', input.x < 0 ? input.y : 0)
							}
						}
					}
				}

				const resetCenter = () => {
					isJoystickPressed(false)
					initialPos(null)
					pixelOffset(new Vector2(0, 0))
					playerInputs?.set('backward', 0)
					playerInputs?.set('forward', 0)
					playerInputs?.set('right', 0)
					playerInputs?.set('left', 0)
				}
				onCleanup(() => {
					playerInputs?.set('backward', 0)
					playerInputs?.set('forward', 0)
					playerInputs?.set('left', 0)
					playerInputs?.set('right', 0)
				})

				const interactableEntity = createMemo(() => interactableQuery()[0])
				const interactables = createMemo(() => getInteractables(player(), interactableEntity()))

				const setInitialPos = (e: TouchEvent) => {
					const joystick = container()
					if (joystick) {
						const size = joystick.getBoundingClientRect()
						initialPos({
							x: e.changedTouches[0].clientX - size.width / 2,
							y: e.changedTouches[0].clientY - size.height / 2,
						})
					}
				}
				const defaultPos = createMemo(() => {
					const pos = initialPos()
					if (pos) {
						return {
							top: `${pos.y}px`,
							left: `${pos.x}px`,
						} as const
					} else {
						return { bottom: '9rem', left: '9rem', position: 'fixed' } as const
					}
				})
				css/* css */`
				.top-button{
					width: 4rem;
					height: 4rem;
					background: hsla(0, 0%, 0%, 0.2);
					border-radius: 1rem;
					border: solid 0.1rem hsla(0, 0%, 100%, 0.3);
					font-size: 2rem;
					color: white;
					display: grid;
					place-items: center;
				}
				.joystick-container{
					position: fixed;
					left: 0;
					bottom: 0;
					top:0;
					right: 50%;
					z-index: 2;
				}
				.joystick{
					position: relative;
					background: var(--brown-dark);
					border: solid var(--gold) 0.5rem;
					border-radius: 1000px;
					width: 12rem;
					height: 12rem;
					opacity:var(--ui-opacity);
					box-shadow:inset 0 0 2rem 0rem black;
				}
				.joystick-center{
					border-radius: 1000px;
					width: 5rem;
					height: 5rem;
					background: var(--gold);
					box-shadow: inset 0.5rem 0.5rem 0 0 var(--gold-shiny);
					position: absolute;
					top: 50%;
					left: 50%;
				}

				.pause-button {
					position: fixed;
					top: 1rem;
					left: 50%;
					transform: translateX(-50%);
					fill: hsla(0,0%,100%);
					display: flex;
					z-index: 100;
					opacity: var(--ui-opacity);
					align-items: center;
					gap: 1rem;
					font-size: 2rem;
					background: var(--gold);
					/* fill: black; */
					padding: 0.2rem 1rem;
					border-radius: 1rem;
					box-shadow: inset 0.2em 0.2em 0 0 var(--gold-shiny), 0.2em 0.2em 0 0 black;
				}
				.inventory-button{
					position: fixed;
					bottom: 15rem;
					right: 14.5rem;
				}
				`
				const primaryInteractable = createMemo(() => interactables()[0])
				const secondaryInteractable = createMemo(() => interactables()[1])
				const pause = (interact: number) => playerInputs?.set('pause', interact)
				return (
					<div>
						<div
							class="pause-button input"
							onTouchStart={() => pause(1)}
							onTouchEnd={() => pause(0)}
							onTouchCancel={() => pause(0)}
						>
							<Pause />
							<OutlineText>Pause</OutlineText>
						</div>

						<div
							class="joystick-container"
							onTouchStart={setInitialPos}
							onTouchMove={moveCenter}
							onTouchEnd={resetCenter}
						>
							<div
								class="joystick"
								ref={container}
								style={{

									...defaultPos(),
								}}
							>
								<div
									class="joystick-center"
									style={{ transform: centerPostion() }}
								>
								</div>
							</div>
						</div>
						<StateUi state="farm">
							<TouchButton input="inventory" controller={playerInputs!} size="7rem" angle="45deg" distance="15rem" text="Open inventory">
								<Inventory />
							</TouchButton>
						</StateUi>
						<StateUi state="dungeon">
							<TouchButton input="lock" controller={playerInputs!} size="7rem" angle="45deg" distance="15rem" text="Lock">
								<Lock />
							</TouchButton>
						</StateUi>
						<TouchButton input="primary" controller={playerInputs!} interactable={primaryInteractable} size="10rem" />
						<TouchButton input="secondary" controller={playerInputs!} interactable={secondaryInteractable} size="7rem" angle="100deg" distance="15rem" />
					</div>
				)
			}}
		</Show>
	)
}
