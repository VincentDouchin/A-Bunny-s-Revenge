import type { With } from 'miniplex'
import { createMemo } from 'solid-js'
import type { Entity } from '@/global/entity'
import { ui } from '@/global/init'

export const HealthUi = (props: { player: With<Entity, 'maxHealth' | 'currentHealth'> }) => {
	const health = ui.sync(() => props.player.currentHealth / props.player.maxHealth.value)
	const max = ui.sync(() => Math.floor(props.player.maxHealth.value))
	const current = ui.sync(() => Math.floor(props.player.currentHealth))
	const healthDisplay = createMemo(() => `${current()} / ${max()}`)
	return (

		<div style={{ position: 'fixed', top: '1rem', left: '1rem' }}>
			<div style={{ 'border': 'solid 0.5rem black', 'height': '3rem', 'width': `${max()}rem`, 'border-radius': '1rem', 'overflow': 'hidden', 'position': 'relative' }}>
				<div style={{ 'background': 'red', 'height': '100%', 'width': `${health() * 100}%`, 'box-shadow': 'hsl(0,0%,0%, 30%) 0rem -0.5rem 0rem 0rem inset' }}></div>
				<div style={{ 'position': 'absolute', 'color': 'white', 'top': '50%', 'left': '50%', 'translate': '-50% -50%', 'font-size': '1.5rem', 'white-space': 'nowrap' }}>{healthDisplay()}</div>
			</div>
		</div>

	)
}