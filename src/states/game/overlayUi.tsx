import { createMemo } from 'solid-js'
import { Portal } from 'solid-js/web'
import { timeOfDayQuery } from './dayNight'
import { ui } from '@/global/init'

export const OverlayUi = () => {
	const timeOfDay = ui.sync(() => timeOfDayQuery.first?.timeOfDay ?? 0)
	const opacity = createMemo(() => String(Math.floor((1 - timeOfDay()) / 2 * 100) / 100))
	return (
		<Portal>
			<div class="overlay no-events" style={{ '--opacity': opacity() }}></div>
		</Portal>
	)
}