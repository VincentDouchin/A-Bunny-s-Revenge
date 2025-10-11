import type { LevelEntity } from '../types'
import { faLink, faLinkSlash, faTrash } from '@fortawesome/free-solid-svg-icons'
import Fa from 'solid-fa'
import { css } from 'solid-styled'

export function SelectedEntityProps({ destroy, entity, update }: {
	destroy: () => void
	entity: LevelEntity
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
	`
	return (
		<section>
			<div class="title">Entities Properties</div>
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
	)
}