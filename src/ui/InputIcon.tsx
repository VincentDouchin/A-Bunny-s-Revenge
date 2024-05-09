import { For, Show, createMemo } from 'solid-js'
import { XBOXSeries } from '@/constants/keys'
import { assets, inputManager } from '@/global/init'
import type { Input } from '@/lib/inputs'

export const InputIcon = (props: { input: Input }) => {
	const controls = inputManager.controls
	const icons = createMemo(() => {
		if (controls === 'keyboard') {
			return inputManager.getKeyName(props.input).map(key => assets.buttons(key))
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
						{icon => <div style={{ 'width': '1.5em', 'overflow': 'hidden', 'aspect-ratio': 1 }} class="input-icon">{icon}</div>}
					</For>
				)
			}}
		</Show>
	)
}