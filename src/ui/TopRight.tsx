import { css } from 'solid-styled'
import { MiniMapUi } from '@/states/dungeon/MinimapUi'
import { StateUi } from './components/StateUi'
import { Toaster } from './Toaster'

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
			<StateUi state="dungeon">
				<MiniMapUi />
			</StateUi>
			<Toaster />
		</div>
	)
}