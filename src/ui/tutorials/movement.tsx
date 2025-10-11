import type { useGame } from '../store'
import { For, Show } from 'solid-js'
import { css } from 'solid-styled'
import { settings } from '@/global/init'
import { playerInputMap } from '@/global/inputMaps'
import { OutlineText, SwitchButtons } from '../components/styledComponents'
import { InputIcon } from '../InputIcon'

export const MovementTutorial = ({ context, player }: {
	context: ReturnType<typeof useGame>
	player: NonNullable<ReturnType<typeof useGame>>['player']
}) => {
	const inputMap = playerInputMap()
	css/* css */`
		.tuto-input-icon{
		font-size:5rem
	}
	.gamepad-controls{
		display:grid;
		grid-template-columns: 1fr 2fr;
		gap: 3rem;
	}
	.control-method{

		text-align:center;
		display: grid;
		gap: 1rem;
		place-items:center;
	}
	.controls{
		font-size: 2rem;
		width: 100%;
	}
	.keys{
		display: flex;
		gap:1rem;
	}
	.dpad{
		display:grid;
		grid-template-areas: ". forward ." "left backward right "
	}
	`
	return (
		<div>
			<Show when={context?.usingGamepad()}>
				<div class="gamepad-controls">
					<div class="tuto-input-icon">
						<InputIcon input={inputMap.playerControls.get('forward')} />
					</div>
					<OutlineText textSize="2rem">Use the left joystick to move around</OutlineText>
				</div>
			</Show>
			<Show when={context?.usingKeyboard()}>
				<div class="control-method">
					<OutlineText textSize="2rem">Do you prefer using the mouse or the keyboard to direct the player?</OutlineText>
					<div class="controls">
						<SwitchButtons options={['keyboard', 'mouse']} value={settings.controls} setValue={val => settings.controls = val} />
					</div>
					<OutlineText textSize="1.5rem">You can change this option in the settings later</OutlineText>
					<br />
					<div class="gamepad-controls">

						<div class="dpad">
							<For each={['right', 'left', 'forward', 'backward'] as const}>
								{dir => <div style={{ 'grid-area': dir }}><InputIcon size={3} input={player().playerControls.get(dir)} /></div>}
							</For>
						</div>
						<OutlineText textSize="2rem">Use the keys to move the player.</OutlineText>
					</div>
					<br />
				</div>
			</Show>
		</div>
	)
}