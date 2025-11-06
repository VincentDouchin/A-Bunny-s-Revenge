import type { LevelEntity } from '../types'
import { faLink, faLinkSlash, faTrash } from '@fortawesome/free-solid-svg-icons'
import Fa from 'solid-fa'
import { For, Show } from 'solid-js'
import { css } from 'solid-styled'

export function SelectedEntityProps({ destroy, entity, update, globalScale }: {
	destroy: () => void
	entity: LevelEntity
	globalScale?: number[]
	update: () => void
}) {
	const setGrid = (key: keyof NonNullable<LevelEntity['grid']>) => (e: Event & {
		currentTarget: HTMLInputElement
		target: HTMLInputElement
	}) => {
		entity.grid ??= {
			repetitionX: 0,
			repetitionY: 0,
			spacingX: 0,
			spacingY: 0,
			[key]: e.target.valueAsNumber,
		}
		entity.grid[key] = e.target.valueAsNumber
		if (entity.grid.repetitionX === 0 && entity.grid.repetitionY === 0) {
			delete entity.grid
		}
		update()
	}

	css/* css */`
	.icon-button{
		padding: 0.5rem;
		width: 100%;
		display: grid;
		place-items: center;
	}
	.button-content{
		display: flex;
		place-items: center;
		gap: 0.5rem;
	}
	.grid-inputs{
		display: grid;
		grid-template-columns: 1fr auto;
		gap: 1rem;
		place-items: center;
		white-space: nowrap;
		padding: 0.5rem;
		background: var(--color-1);
	}
	.grid-inputs input{
		height: 100%;
		width: 5rem;
	}
	.selected-entity-props-buttons{
		display: grid;
		grid-template-columns: 1fr 1fr;
	}
	.vec-display{
		display: grid;
		grid-template-columns: 1fr 1fr 1fr;
		place-items: center;
		padding: 0.5rem;
	}
	.vec-display > div{
		display: grid;
		grid-template-columns: 1fr 1fr;
		place-items: center;

	}
	`
	return (
		<>
			<section class="selected-entity-props-buttons">
				<button class="icon-button" onClick={destroy}>
					<div class="button-content">
						Remove
						<Fa icon={faTrash} />
					</div>
				</button>
				<button
					class="icon-button"
					onClick={() => {
						entity.grounded = !entity.grounded
						update()
					}}
					classList={{ selected: entity.grounded }}
				>
					<div class="button-content">
						Grounded
						<Fa icon={entity.grounded ? faLink : faLinkSlash} />
					</div>
				</button>
			</section>
			<section>
				<div class="title">Position</div>
				<div class="vec-display">
					<For each={['X', 'Y', 'Z']}>
						{(axis, index) => (
							<div>
								{axis}

								<div>
									{entity.position[index()].toFixed(1)}
								</div>
							</div>
						)}
					</For>
				</div>
			</section>
			<section>
				<div class="title">Scale</div>
				<div class="vec-display">
					<For each={['X', 'Y', 'Z']}>
						{(axis, index) => (
							<div>
								{axis}
								<div>
									{entity.scale?.[index()].toFixed(1)}
								</div>
							</div>
						)}
					</For>
				</div>
			</section>
			<Show when={globalScale?.some(Boolean)}>
				<section>
					<div class="title">Model scale</div>
					<div class="vec-display">
						<For each={['X', 'Y', 'Z']}>
							{(axis, index) => (
								<div>
									{axis}
									<div>
										{globalScale?.[index()].toFixed(1)}
									</div>
								</div>
							)}
						</For>
					</div>
				</section>
			</Show>
			<section>
				<div class="title">Repetitions</div>

				<div class="grid-inputs">
					Repetition X
					<input type="number" value={entity.grid?.repetitionX ?? 0} onChange={setGrid('repetitionX')}></input>
					Repetition Y
					<input type="number" value={entity.grid?.repetitionY ?? 0} onChange={setGrid('repetitionY')}></input>
					Spacing X
					<input type="number" value={entity.grid?.spacingX ?? 0} onChange={setGrid('spacingX')}></input>
					Spacing Y
					<input type="number" value={entity.grid?.spacingY ?? 0} onChange={setGrid('spacingY')}></input>
				</div>
			</section>
		</>
	)
}