import type { Accessor } from 'solid-js'
import type { Atom } from 'solid-use/atom'
import { css } from 'solid-styled'

export function RangeInput({ name, value, min = 0, max = 100, step = 1 }: {
	name: string
	value: Atom<number> | Atom<number | null>
	min?: Accessor<number> | number
	max?: Accessor<number> | number
	step?: Accessor<number> | number
}) {
	const onWheel = (e: WheelEvent) => {
		e.preventDefault()
		value((value() ?? 0) + Math.sign(e.deltaY) * (typeof max === 'function' ? max() : max) * 0.05)
	}
	css/* css */`
	.range-input {
		display: grid;
		grid-template-rows:auto 1fr;
		place-items: center;
		padding: 0.5rem;
		background: var(--color-1);
		border-top: solid 2px var(--color-3)
	}
	.range-input input {
		width: 100%
	}
	`
	return (
		<div class="range-input" onWheel={onWheel}>
			<label>{name}</label>
			<input
				type="range"
				value={value() ?? 0}
				onChange={e => value(e.target.valueAsNumber)}
				min={typeof min === 'function' ? min() : min}
				max={typeof max === 'function' ? max() : max}
				step={typeof step === 'function' ? step() : step}
			/>
		</div>
	)
}