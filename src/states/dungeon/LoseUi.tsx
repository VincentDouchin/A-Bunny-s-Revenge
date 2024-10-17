import type { Entity } from '@/global/entity'
import type { With } from 'miniplex'
import { ecs, ui } from '@/global/init'
import { menuInputMap } from '@/global/inputMaps'
import { playSound } from '@/global/sounds'
import { campState, openMenuState } from '@/global/states'
import { inMap } from '@/lib/hierarchy'
import { StateUi } from '@/ui/components/StateUi'
import { InputIcon } from '@/ui/InputIcon'
import { useGame, useQuery } from '@/ui/store'
import { createMemo, onMount, Show } from 'solid-js'
import { css } from 'solid-styled'
import atom from 'solid-use/atom'

const playerUi = useQuery(ecs.with('player', 'state').where(e => e.state !== 'dead'))
export const LoseUi = () => {
	const noPlayer = createMemo(() => playerUi().length === 0)
	const retry = () => {
		openMenuState.disable()
		campState.enable({ door: 'clearing' })
	}

	css/* css */`
	.losing{
		height: fit-content;
		place-self: center;
		background: linear-gradient(0deg, transparent, hsla(0, 0%, 0%, 0.4) 20% 80%, transparent);
		width: 100%;
		text-align: center;
		font-size: 9rem;
		color: red;
		position: relative;

	}
	.losing-button{
		margin: auto;
		position: absolute;
		left: 50%;
		transform: translateX(-50%);
		display: flex;
		align-items: center;
		gap: 1rem;
}
	`
	return (
		<StateUi state={openMenuState}>
			<Show when={noPlayer()}>
				{(_) =>	{
					const context = useGame()
					const controls = atom<null | With<Entity, 'menuInputs'>>(null)
					onMount(() => {
						playSound('losing_musical')
						controls(ecs.add({
							...menuInputMap(),
							...inMap(),
						}))
					})
					ui.updateSync(() => {
						if (controls()?.menuInputs.get('validate').justPressed) {
							retry()
						}
					})
					return (
						<div
							class="fade-in losing"
						>
							YOU DIED
							<button
								class="button losing-button"
								onClick={retry}
							>
								<Show when={!context?.usingTouch() && controls()}>
									{controls => <InputIcon input={controls().menuInputs.get('validate')} />}
								</Show>
								{' '}
								Retry
							</button>
						</div>
					) }}
			</Show>
		</StateUi>
	)
}