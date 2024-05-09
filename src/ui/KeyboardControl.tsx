import type { With } from 'miniplex'
import { Show } from 'solid-js'
import { css } from 'solid-styled'
import { InputIcon } from './InputIcon'
import { getInteractables } from './Interactions'
import type { Entity } from '@/global/entity'

export const KeyboardControls = ({
	player,
}: {
	player: With<Entity, 'playerControls' | 'inventory'>
}) => {
	const interactables = getInteractables(player)
	css/* css */`
	.controls-container{
		position: fixed;
		bottom:0;
		right: 0;
		margin: 1rem;
		border-radius: 1rem;
		overflow: hidden;
		padding: 1rem;
		gap:1rem;
	}
	.keyboard-controls{
		font-size:2rem;
		display:flex;
		gap:0.5rem;
		color: white;	
	}
	.controls-icons{
		display: flex;
		gap:0.2rem;
	}
	`
	return (

		<div class="controls-container styled-container">
			<div class="keyboard-controls">
				<div class="controls-icons">
					<InputIcon input={player.playerControls.get('forward')}></InputIcon>
					<InputIcon input={player.playerControls.get('left')}></InputIcon>
					<InputIcon input={player.playerControls.get('backward')}></InputIcon>
					<InputIcon input={player.playerControls.get('right')}></InputIcon>
				</div>
				<div>Move</div>
			</div>
			<Show when={interactables[0]}>
				{(interactable) => {
					return (
						<div class="keyboard-controls">
							<InputIcon input={player.playerControls.get('primary')}></InputIcon>
							{interactable()}

						</div>
					)
				}}
			</Show>
			<Show when={interactables[1]}>
				{(interactable) => {
					return (
						<div class="keyboard-controls">
							<InputIcon input={player.playerControls.get('secondary')}></InputIcon>
							{interactable()}

						</div>
					)
				}}
			</Show>
		</div>
	)
}