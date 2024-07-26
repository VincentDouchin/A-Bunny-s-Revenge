import { css } from 'solid-styled'

export const MainMenuUi = () => {
	css/* css */`
	.main-menu-ui-container{
		position:fixed;
		top: 3rem;
		right:3rem;
		fill:white;
		font-size: 5rem;
		
	}
	`
	// const mute = () => {
	// 	settings.mute = !settings.mute
	// 	Howler.mute(settings.mute)
	// }
	return (
		<div class="main-menu-ui-container">
			{/* <div onClick={mute}>
				<Show when={settings.mute}>
					<VolumeOff />
				</Show>
				<Show when={!settings.mute}>
					<VolumeOn />
				</Show>
			</div> */}
		</div>
	)
}