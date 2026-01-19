import type { Atom } from 'solid-use/atom'
import { faArrowsLeftRight, faArrowsUpDown } from '@fortawesome/free-solid-svg-icons'
import Fa from 'solid-fa'
import { For } from 'solid-js'
import { css } from 'solid-styled'
import { Vector2 } from 'three'

export function LevelProps({ levelSize, floorTexture }: {
	levelSize: Atom<Vector2 | null>
	floorTexture: Atom<'grass' | 'planks' | null>
}) {
	css/* css */`
	.props-inputs {
		display: grid;
		grid-template-columns: auto 1fr;
		padding:0 1rem;
		gap: 0 0.5rem;
	}
	.size-icon {
		padding: 0.5rem;
		background: var(--color-1);
		aspect-ratio: 1;
		text-align: center;
	}
	`

	return (
		<section>
			<div class="title">Level Properties</div>
			<div class="props-inputs">
				<div class="size-icon"><Fa icon={faArrowsLeftRight}></Fa></div>
				<input type="number" value={levelSize()?.x} onChange={e => levelSize(new Vector2(e.target.valueAsNumber, levelSize()?.y ?? 1))} />
				<div class="size-icon"><Fa icon={faArrowsUpDown}></Fa></div>
				<input type="number" value={levelSize()?.y} onChange={e => levelSize(new Vector2(levelSize()?.x ?? 1, e.target.valueAsNumber))} />
				Floor
				<select value={floorTexture() ?? undefined} onChange={e => floorTexture(e.target.value as 'grass' | 'planks')}>
					<For each={['grass', 'planks']}>
						{floor => <option value={floor}>{floor}</option>}
					</For>
				</select>
			</div>
		</section>
	)
}