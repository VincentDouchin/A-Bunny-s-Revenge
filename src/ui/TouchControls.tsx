import { Show, createEffect, createMemo, createSignal } from 'solid-js'
import { Vector2 } from 'three'
import pause from '@assets/icons/pause-solid.svg?raw'
import basket from '@assets/icons/basket-shopping-solid.svg?raw'
import { ecs, inputManager, ui } from '@/global/init'
import { openMenuState, pausedState } from '@/global/states'
import { addTag } from '@/lib/hierarchy'

const playerQuery = ecs.with('playerControls')

export const TouchControls = () => {
	const player = ui.sync(() => playerQuery.first)
	const playerInputs = createMemo(() => player()?.playerControls.touchController)
	const controls = ui.sync(() => inputManager.controls)
	const isMenuOpen = ui.sync(() => openMenuState.enabled)
	const isTouch = createMemo(() => controls() === 'touch')
	const [pixelOffset, setPixelOffset] = createSignal(new Vector2(0, 0))
	const centerPostion = createMemo(() => `translate(calc(-50% + ${pixelOffset().x}px),calc(-50% + ${pixelOffset().y}px) )`)
	const [container, setContainer] = createSignal<null | HTMLDivElement>(null)
	const [isJoystickPressed, setIsJoystickPressed] = createSignal(false)
	const moveCenter = (e: TouchEvent) => {
		setIsJoystickPressed(true)
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
				setPixelOffset(newPos)
				const input = newPos.clone().normalize()
				const touchController = playerInputs()
				if (touchController) {
					touchController.set('left', input.x < 0 ? -input.x : 0)
					touchController.set('right', input.x > 0 ? input.x : 0)
					touchController.set('forward', input.x > 0 ? -input.y : 0)
					touchController.set('backward', input.x < 0 ? input.y : 0)
				}
			}
		}
	}
	const interact = (value: number) => () => {
		playerInputs()?.set('interact', value)
	}
	const isInteractPressed = ui.sync(() => playerInputs()?.get('interact'))
	const isPauseState = ui.sync(() => pausedState.enabled)
	const resetCenter = () => {
		setIsJoystickPressed(false)
		setPixelOffset(new Vector2(0, 0))
		playerInputs()?.set('backward', 0)
		playerInputs()?.set('forward', 0)
		playerInputs()?.set('right', 0)
		playerInputs()?.set('left', 0)
	}
	const areControlsShow = createMemo(() => isTouch() && playerInputs() && !isMenuOpen() && !isPauseState())
	createEffect(() => {
		if (!areControlsShow()) {
			playerInputs()?.set('backward', 0)
			playerInputs()?.set('forward', 0)
			playerInputs()?.set('left', 0)
			playerInputs()?.set('right', 0)
			playerInputs()?.set('interact', 0)
		}
	})
	const openInventory = () => {
		const p = player()
		if (p) {
			addTag(p, 'openInventory')
		}
	}
	return (
		<Show when={areControlsShow()}>
			<div style={{ position: 'fixed', margin: '1rem', display: 'flex', gap: '1rem', top: '0', right: '0' }}>
				<div style={{ 'width': '4rem', 'height': '4rem', 'background': 'hsl(0,0%,0%, 20%)', 'border-radius': '1rem', 'border': `solid 0.1rem hsl(0, 0%,100%, 30% )`, 'font-size': '2rem', 'color': 'white', 'display': 'grid', 'place-items': 'center' }} class="icon-container" innerHTML={pause} onTouchStart={() => pausedState.enable()}></div>
				<div style={{ 'width': '4rem', 'height': '4rem', 'background': 'hsl(0,0%,0%, 20%)', 'border-radius': '1rem', 'border': `solid 0.1rem hsl(0, 0%,100%, 30% )`, 'font-size': '2rem', 'color': 'white', 'display': 'grid', 'place-items': 'center' }} class="icon-container" innerHTML={basket} onTouchStart={openInventory}></div>
			</div>
			<div style={{ position: 'fixed', margin: '3rem', left: '0', bottom: '0', right: '0' }}>
				<div ref={el => setContainer(el)} onTouchMove={moveCenter} onTouchEnd={resetCenter} style={{ 'position': 'relative', 'background': 'hsl(0,0%,0%, 20%)', 'border-radius': '1000px', 'width': '8rem', 'height': '8rem', 'border': `solid ${isJoystickPressed() ? '0.3rem' : '0.1rem'} hsl(0, 0%,100%, 30% )` }}>
					<div style={{ 'border-radius': '1000px', 'width': '3rem', 'height': '3rem', 'background': 'hsl(0, 0%,100%, 30% )', 'position': 'absolute', 'top': '50%', 'left': '50%', 'transform': centerPostion() }}></div>
				</div>
				<div style={{ 'width': '4rem', 'height': '4rem', 'background': 'hsl(0,0%,0%, 20%)', 'position': 'absolute', 'bottom': '0', 'right': '0', 'margin': '2em', 'border-radius': '1rem', 'border': `solid ${isInteractPressed() ? '0.3rem' : '0.1rem'} hsl(0, 0%,100%, 30% )` }} onTouchStart={interact(1)} onTouchEnd={interact(0)}></div>
			</div>
		</Show>
	)
}