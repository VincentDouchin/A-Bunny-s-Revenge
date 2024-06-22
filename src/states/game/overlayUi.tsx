import { createMemo } from 'solid-js'
import { Portal } from 'solid-js/web'
import { css } from 'solid-styled'
import { dayTime, ui } from '@/global/init'

export const OverlayUi = () => {
	const timeOfDay = ui.sync(() => dayTime.current)
	const opacity = createMemo(() => String(Math.floor((1 - timeOfDay()) / 2 * 100) / 100))
	css/* css */`
	.overlay {
		position: fixed;
		inset: 0;
		background: linear-gradient(
			45deg in lab,
			lch(39 53.53 282.75 / var(--opacity)),
			lch(65 67.77 57.86 / var(--opacity))
		);
		mix-blend-mode: soft-light;
		filter: saturate(0%);
	}
	`
	return (
		<Portal>
			<div class="overlay no-events" style={{ '--opacity': opacity() }}></div>
		</Portal>
	)
}