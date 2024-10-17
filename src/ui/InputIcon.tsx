import type { Input } from '@/lib/inputs'
import { XBOXSeries } from '@/constants/keys'
import { assets, inputManager, settings } from '@/global/init'
import { createMemo, For, Show } from 'solid-js'
import { useGame } from './store'

export const InputIcon = (props: { input: Input, size?: number }) => {
	const context = useGame()
	const icons = createMemo(() => {
		if (context?.controls() === 'keyboard') {
			return inputManager.getKeyName(props.input, settings.controls).map(key => assets.buttons(key))
		} else if (props.input.axes.length > 0) {
			return props.input.axes.map(([axis]) => assets.buttons(XBOXSeries.axes[Math.floor(axis / 2)]))
		} else if (props.input.buttons.length > 0) {
			return props.input.buttons.map(button => assets.buttons(XBOXSeries.buttons[button]))
		}
	})
	return (
		<Show when={icons()}>
			{(iconsTextures) => {
				return (
					<For each={iconsTextures()}>
						{icon => <div style={{ 'width': `calc(1.5em * ${props.size ?? 1})`, 'overflow': 'hidden', 'aspect-ratio': 1 }} class="input-icon">{icon}</div>}
					</For>
				)
			}}
		</Show>
	)
}