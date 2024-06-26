import { Show, createMemo, onMount } from 'solid-js'
import { css } from 'solid-styled'
import type { With } from 'miniplex'
import atom from 'solid-use/atom'
import { ecs, ui } from '@/global/init'
import { campState, openMenuState } from '@/global/states'
import { StateUi } from '@/ui/components/StateUi'
import { useQuery } from '@/ui/store'
import type { Entity } from '@/global/entity'
import { menuInputMap } from '@/global/inputMaps'
import { InputIcon } from '@/ui/InputIcon'
import { inMap } from '@/lib/hierarchy'

const playerUi = useQuery(ecs.with('player'))
export const LoseUi = () => {
	const noPlayer = createMemo(() => playerUi().length === 0)
	const retry = () => {
		openMenuState.disable()
		campState.enable({})
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
					const controls = atom<null | With<Entity, 'menuInputs'>>(null)
					onMount(() => {
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
								<Show when={controls()}>
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