import { createMemo } from 'solid-js'
import { Portal } from 'solid-js/web'
import { dayTime, ui } from '@/global/init'

export const OverlayUi = () => {
	const timeOfDay = ui.sync(() => dayTime.current)
	const opacity = createMemo(() => String(Math.floor((1 - timeOfDay()) / 2 * 100) / 100))
	return (
		<Portal>
			<div class="overlay no-events" style={{ '--opacity': opacity() }}></div>
		</Portal>
	)
}