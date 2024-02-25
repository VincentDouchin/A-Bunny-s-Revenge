import basket from '@assets/icons/basket-shopping-solid.svg?raw'
import pause from '@assets/icons/pause-solid.svg?raw'
import type { With } from 'miniplex'
import { createMemo, createSignal, onCleanup } from 'solid-js'
import { Vector2 } from 'three'
import { getInteractables } from './Interactions'
import { pausedState } from '@/global/states'
import { ecs, ui } from '@/global/init'
import { type Entity, MenuType } from '@/global/entity'

export const TouchControls = ({ player }: { player: With<Entity, 'playerControls' | 'inventory'> }) => {
	const playerInputs = () => player.playerControls.touchController
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
				const input = newPos.clone().normalize().multiplyScalar(newPos.length() / max)
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

	const resetCenter = () => {
		setIsJoystickPressed(false)
		setPixelOffset(new Vector2(0, 0))
		playerInputs()?.set('backward', 0)
		playerInputs()?.set('forward', 0)
		playerInputs()?.set('right', 0)
		playerInputs()?.set('left', 0)
	}
	onCleanup(() => {
		playerInputs()?.set('backward', 0)
		playerInputs()?.set('forward', 0)
		playerInputs()?.set('left', 0)
		playerInputs()?.set('right', 0)
		playerInputs()?.set('primary', 0)
	})
	const openInventory = () => {
		ecs.addComponent(player, 'menuType', MenuType.Player)
	}
	const interactableQuery = ecs.with('interactable', 'interactionContainer')
	const interactableEntity = ui.sync(() => interactableQuery.first)
	const interactables = createMemo(() => getInteractables(player, interactableEntity()))
	const interact = (value: number, input: 'primary' | 'secondary') => () => {
		playerInputs()?.set(input, value)
	}
	const isPrimaryPressed = ui.sync(() => playerInputs()?.get('primary'))
	const isSecondaryPressed = ui.sync(() => playerInputs()?.get('secondary'))
	return (
		<div>
			<div style={{ position: 'fixed', margin: '1rem', display: 'flex', gap: '1rem', top: '0', right: '0' }}>
				<div style={{ 'width': '4rem', 'height': '4rem', 'background': 'hsl(0,0%,0%, 20%)', 'border-radius': '1rem', 'border': `solid 0.1rem hsl(0, 0%,100%, 30% )`, 'font-size': '2rem', 'color': 'white', 'display': 'grid', 'place-items': 'center' }} class="icon-container" innerHTML={pause} onTouchStart={() => pausedState.enable()}></div>
				<div style={{ 'width': '4rem', 'height': '4rem', 'background': 'hsl(0,0%,0%, 20%)', 'border-radius': '1rem', 'border': `solid 0.1rem hsl(0, 0%,100%, 30% )`, 'font-size': '2rem', 'color': 'white', 'display': 'grid', 'place-items': 'center' }} class="icon-container" innerHTML={basket} onTouchStart={openInventory}></div>
			</div>
			<div style={{ position: 'fixed', margin: '9rem', left: '0', bottom: '0', right: '0' }}>
				<div ref={el => setContainer(el)} onTouchMove={moveCenter} onTouchEnd={resetCenter} style={{ 'position': 'relative', 'background': 'hsl(0,0%,0%, 20%)', 'border-radius': '1000px', 'width': '12rem', 'height': '12rem', 'border': `solid ${isJoystickPressed() ? '0.3rem' : '0.1rem'} hsl(0, 0%,100%, 30% )` }}>
					<div style={{ 'border-radius': '1000px', 'width': '5rem', 'height': '5rem', 'background': 'hsl(0, 0%,100%, 30% )', 'position': 'absolute', 'top': '50%', 'left': '50%', 'transform': centerPostion() }}></div>
				</div>
			</div>
			<div style={{ position: 'absolute', bottom: '0', right: '0', margin: '4em', display: 'flex', gap: '4rem' }}>
				<div style={{ 'position': 'relative', 'width': '5rem', 'height': '5rem', 'background': 'hsl(0,0%,0%, 20%)', 'border-radius': '3rem', 'border': `solid ${isSecondaryPressed() ? '0.3rem' : '0.1rem'} hsl(0, 0%,100%, 30% )` }} onTouchStart={interact(1, 'secondary')} onTouchEnd={interact(0, 'secondary')}>
					<div style={{ 'color': 'white', 'position': 'absolute', 'top': '100%', 'left': '50%', 'translate': '-50% 0', 'padding-top': '0.5rem', 'white-space': 'nowrap', 'font-size': '1.5rem' }}>{interactables()[1]}</div>
				</div>
				<div style={{ 'position': 'relative', 'width': '5rem', 'height': '5rem', 'background': 'hsl(0,0%,0%, 20%)', 'border-radius': '3rem', 'border': `solid ${isPrimaryPressed() ? '0.3rem' : '0.1rem'} hsl(0, 0%,100%, 30% )` }} onTouchStart={interact(1, 'primary')} onTouchEnd={interact(0, 'primary')}>
					<div style={{ 'color': 'white', 'position': 'absolute', 'top': '100%', 'left': '50%', 'translate': '-50% 0', 'padding-top': '0.5rem', 'white-space': 'nowrap', 'font-size': '1.5rem' }}>{interactables()[0]}</div>
				</div>
			</div>
		</div>
	)
}