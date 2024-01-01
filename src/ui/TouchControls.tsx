import { Show, createEffect, createMemo, createSignal } from 'solid-js'
import { Vector2 } from 'three'
import { ecs, inputManager, ui } from '@/global/init'
import { openMenuState } from '@/global/states'

const playerQuery = ecs.with('playerControls')

export const TouchControls = () => {
	const playerInputs = ui.sync(() => playerQuery.first?.playerControls.touchController)
	const controls = ui.sync(() => inputManager.controls)
	const isMenuOpen = ui.sync(() => openMenuState.enabled)
	const isTouch = createMemo(() => controls() === 'touch')
	const [pixelOffset, setPixelOffset] = createSignal(new Vector2(0, 0))
	const centerPostion = createMemo(() => `translate(calc(-50% + ${pixelOffset().x}px),calc(-50% + ${pixelOffset().y}px) )`)
	const [container, setContainer] = createSignal<null | HTMLDivElement>(null)
	const [isJoystickPressed, setIsJoystickPressed] = createSignal(false)
	const moveCenter = (e: TouchEvent) => {
		e.preventDefault()
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
	const resetCenter = () => {
		setIsJoystickPressed(false)
		setPixelOffset(new Vector2(0, 0))
		playerInputs()?.set('backward', 0)
		playerInputs()?.set('forward', 0)
		playerInputs()?.set('right', 0)
		playerInputs()?.set('left', 0)
	}
	const areControlsShow = createMemo(() => isTouch() && playerInputs() && !isMenuOpen())
	createEffect(() => {
		if (!areControlsShow()) {
			playerInputs()?.set('backward', 0)
			playerInputs()?.set('forward', 0)
			playerInputs()?.set('left', 0)
			playerInputs()?.set('right', 0)
			playerInputs()?.set('interact', 0)
		}
	})
	return (
		<Show when={areControlsShow()}>
			<div style={{ position: 'fixed', margin: '3rem', left: '0', bottom: '0', right: '0' }}>
				<div ref={el => setContainer(el)} onTouchMove={moveCenter} onTouchEnd={resetCenter} style={{ 'position': 'relative', 'background': 'hsl(0,0%,0%, 20%)', 'border-radius': '1000px', 'width': '8rem', 'height': '8rem', 'border': `solid ${isJoystickPressed() ? '0.3rem' : '0.1rem'} hsl(0, 0%,100%, 30% )`, 'box-sizing': 'border-box' }}>
					<div style={{ 'border-radius': '1000px', 'width': '3rem', 'height': '3rem', 'background': 'hsl(0, 0%,100%, 30% )', 'position': 'absolute', 'top': '50%', 'left': '50%', 'transform': centerPostion() }}></div>
				</div>
				<div style={{ 'width': '4rem', 'height': '4rem', 'background': 'hsl(0,0%,0%, 20%)', 'position': 'absolute', 'bottom': '0', 'right': '0', 'margin': '2em', 'border-radius': '1rem', 'border': `solid ${isInteractPressed() ? '0.3rem' : '0.1rem'} hsl(0, 0%,100%, 30% )`, 'box-sizing': 'border-box' }} onTouchStart={interact(1)} onTouchEnd={interact(0)}></div>
			</div>
		</Show>
	)
}