import { For, createMemo } from 'solid-js'
import { assets, inputManager } from '@/global/init'
import type { Input } from '@/lib/inputs'

export const InputIcon = (props: { input: Input }) => {
	const controls = inputManager.controls
	const icons = createMemo(() => {
		if (controls === 'keyboard') {
			return inputManager.getKeyName(props.input).map(key => assets.buttons(key))
		}
	})
	return (
		<For each={icons()}>
			{icon => <div style={{ 'width': '1.5em', 'overflow': 'hidden', 'aspect-ratio': 1 }} class="input-icon">{icon}</div>}
		</For>
	)
}