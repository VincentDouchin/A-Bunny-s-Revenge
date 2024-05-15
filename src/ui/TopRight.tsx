import { css } from 'solid-styled'
import { StateUi } from './components/StateUi'
import { Toaster } from './Toaster'
import { dungeonState } from '@/global/states'
import { MiniMapUi } from '@/states/dungeon/MinimapUi'

export const TopRight = () => {
	css/* css */`
	.top-right{
		position:fixed;
		top:0;
		right:0;
		display: grid;
		justify-items: end;
	}
	`
	return (
		<div class="top-right">
			<StateUi state={dungeonState}>
				<MiniMapUi />

			</StateUi>
			<Toaster />
		</div>
	)
}