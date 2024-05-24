import { For, Show, createMemo, onCleanup } from 'solid-js'
import { css } from 'solid-styled'
import { Transition } from 'solid-transition-group'
import type { Vec2 } from 'three'
import { Vector2 } from 'three'
import Pause from '@assets/icons/pause-solid.svg'
import Inventory from '@assets/icons/basket-shopping-solid.svg'
import { getInteractables } from './Interactions'
import { StateUi } from './components/StateUi'
import { useGame } from './store'
import { atom } from '@/lib/uiManager'
import { campState, pausedState } from '@/global/states'
import { ecs, ui } from '@/global/init'
import { MenuType } from '@/global/entity'

export const TouchControls = () => {
	const context = useGame()
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
					playerInputs?.set('primary', 0)
				})
				const openInventory = () => {
					ecs.addComponent(player(), 'menuType', MenuType.Player)
				}
				const interactableQuery = ecs.with('interactable', 'interactionContainer')
				const interactableEntity = ui.sync(() => interactableQuery.first)
				const interactables = createMemo(() => getInteractables(player(), interactableEntity()))
				const interact = (value: number, input: 'primary' | 'secondary') => () => {
					playerInputs?.set(input, value)
				}
				const isPressed = (input: 'primary' | 'secondary') => playerInputs?.get(input)
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
		background: hsl(0, 0%, 0%);
		border-radius: 1000px;
		width: 12rem;
		height: 12rem;
		opacity: 20%;
	}
	.joystick-center{
		border-radius: 1000px;
		width: 5rem;
		height: 5rem;
		background: hsl(0, 0%, 100%);
		position: absolute;
		top: 50%;
		left: 50%;
	}
	.inputs-container{
		position: absolute;
		bottom: 0;
		right: 0;
		margin: 7em;
		display: flex;
		gap: 7rem;
		flex-direction: row-reverse;
	}
	.touch-input{
		transition: all 0.2s ease;
		position: relative;
		width: 8rem;
		height: 8rem;
		background: hsl(0, 0%, 0%);
		border-radius: 100rem;
	}
	.interactable-text{
		color: white;
		position: absolute;
		top: 100%;
		left: 50%;
		transform: translate(-50%, 0);
		padding-top: 0.5rem;
		white-space: nowrap;
		font-size: 3rem;
	}
	.pause-button {
		position: fixed;
		top: 1rem;
		left: 50%;
		transform: translateX(-50%);
		color: white;
		display: flex;
		align-items:center;
		gap:1rem;
		font-size: 2rem
	}
	.inventory-button{
		font-size: 4rem;
		opacity: 20%;
		fill:white;
		display: grid;
		place-items:center;
		position: fixed;
		bottom: 15rem;
		right: 14.5rem;
		border: solid 0.1rem hsl(0, 0%,100%);
	}`
				return (
					<div>
						<button class="pause-button button" onTouchStart={() => pausedState.enable()}>
							<Pause />
							Pause
						</button>

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
									border: `solid ${isJoystickPressed() ? '0.3rem' : '0.1rem'} hsl(0, 0%,100%)`,
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
						<StateUi state={campState}>
							<div onTouchStart={openInventory} class="inventory-button touch-input">
								<Inventory />
							</div>
						</StateUi>
						<div class="inputs-container">
							<For each={['primary', 'secondary'] as const}>
								{(input, index) => {
									return (
										<div
											style={{
												border: `solid ${isPressed(input) ? '0.3rem' : '0.1rem'} hsl(0, 0%,100%)`,
												opacity: interactables()[index()] ? '50%' : '20%',
											}}
											class="touch-input"
											onTouchStart={interact(1, input)}
											onTouchEnd={interact(0, input)}
										>
											<Transition name="popup">
												<Show when={interactables()[index()]}>
													{(interactable) => {
														return <div class="interactable-text">{interactable()}</div>
													}}
												</Show>
											</Transition>
										</div>
									)
								}}
							</For>
						</div>
					</div>
				)
			}}
		</Show>
	)
}