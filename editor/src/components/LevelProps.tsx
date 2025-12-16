import type { Atom } from 'solid-use/atom'
import { faArrowsLeftRight, faArrowsUpDown } from '@fortawesome/free-solid-svg-icons'
import Fa from 'solid-fa'
import { css } from 'solid-styled'
import { Vector2 } from 'three'

export function LevelProps({ levelSize }: {
	levelSize: Atom<Vector2 | null>
}) {
	css/* css */`
	.size-input {
		display: grid;
		grid-template-columns: auto 1fr;
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
			<div class="size-input">
				<div class="size-icon"><Fa icon={faArrowsLeftRight}></Fa></div>
				<input type="number" value={levelSize()?.x} onChange={e => levelSize(new Vector2(e.target.valueAsNumber, levelSize()?.y ?? 1))} />
			</div>
			<div class="size-input">
				<div class="size-icon"><Fa icon={faArrowsUpDown}></Fa></div>
				<input type="number" value={levelSize()?.y} onChange={e => levelSize(new Vector2(levelSize()?.x ?? 1, e.target.valueAsNumber))} />
			</div>
		</section>
	)
}