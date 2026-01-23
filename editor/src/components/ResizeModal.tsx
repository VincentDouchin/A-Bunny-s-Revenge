import type { Accessor } from 'solid-js'
import type { Vec2 } from 'three'
import { faArrowDown, faArrowLeft, faArrowRight, faArrowsLeftRight, faArrowsUpDown, faArrowsUpDownLeftRight, faArrowUp } from '@fortawesome/free-solid-svg-icons'
import Fa from 'solid-fa'
import { createEffect, on } from 'solid-js'
import { css } from 'solid-styled'
import atom from 'solid-use/atom'
import { Modal } from './Modal'

export type AnchorX = 'left' | 'right' | 'center'
export type AnchorY = 'top' | 'bottom' | 'center'

export function ResizeModal({ size, resize }: {
	size: Accessor<Vec2>
	resize: (anchorX: AnchorX, anchorY: AnchorY, mode: 'extend' | 'resize', size: Vec2) => void
}) {
	const open = atom(false)
	const anchorX = atom<AnchorX>('center')
	const anchorY = atom<'top' | 'bottom' | 'center'>('center')
	const mode = atom<'extend' | 'resize'>('extend')
	const sizeX = atom(size().x)
	const sizeY = atom(size().y)
	createEffect(on(size, () => {
		sizeX(size().x)
		sizeY(size().y)
	}))
	const buttonProps = (x: AnchorX, y: 'top' | 'bottom' | 'center') => {
		return {
			onClick: () => {
				anchorX(x)
				anchorY(y)
			},
			class: anchorX() === x && anchorY() === y ? 'selected' : '',
		}
	}
	css/* css */`
	.resize-grid{
		display: grid;
		grid-template-columns: 1fr 1fr 1fr;
	}
	.size-inputs{
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 1rem;
		place-items: center;
	}
	`
	return (
		<>
			<Modal
				closable
				title="Resize"
				open={open}
				trigger={(
					<>
						<button onClick={() => open(!open())} with-icon>
							<Fa icon={faArrowsUpDownLeftRight}></Fa>
							Resize
						</button>
					</>
				)}
			>
				<div class="resize-grid">
					<button {...buttonProps('left', 'top')}>
						<div style={{ transform: 'rotate(45deg)' }}>
							<Fa icon={faArrowLeft}></Fa>
						</div>
					</button>
					<button {...buttonProps('center', 'top')}>
						<div>
							<Fa icon={faArrowUp}></Fa>
						</div>
					</button>
					<button {...buttonProps('right', 'top')}>
						<div style={{ transform: 'rotate(-45deg)' }}>
							<Fa icon={faArrowRight}></Fa>
						</div>
					</button>
					<button {...buttonProps('left', 'center')}>
						<div>
							<Fa icon={faArrowLeft}></Fa>
						</div>
					</button>
					<button {...buttonProps('center', 'center')}>
						<div>
							<Fa icon={faArrowsUpDownLeftRight}></Fa>
						</div>
					</button>
					<button {...buttonProps('right', 'center')}>
						<div>
							<Fa icon={faArrowRight}></Fa>
						</div>
					</button>
					<button {...buttonProps('left', 'bottom')}>
						<div style={{ transform: 'rotate(-45deg)' }}>
							<Fa icon={faArrowLeft}></Fa>
						</div>
					</button>
					<button {...buttonProps('center', 'bottom')}>
						<div>
							<Fa icon={faArrowDown}></Fa>
						</div>
					</button>
					<button {...buttonProps('right', 'bottom')}>
						<div style={{ transform: 'rotate(45deg)' }}>
							<Fa icon={faArrowRight}></Fa>
						</div>
					</button>
				</div>
				<div class="size-inputs">
					<Fa icon={faArrowsLeftRight}></Fa>
					<input type="number" value={sizeX()} onChange={e => sizeX(e.target.valueAsNumber)}></input>

					<Fa icon={faArrowsUpDown}></Fa>
					<input type="number" value={sizeY()} onChange={e => sizeY(e.target.valueAsNumber)}></input>
				</div>
				<div>
					<select onChange={e => mode(e.target.value as 'extend' | 'resize')}>
						<option value="extend">extend</option>
						<option value="resize">resize</option>
					</select>
				</div>
				<button onClick={() => resize(anchorX(), anchorY(), mode(), { x: sizeX(), y: sizeY() })}>Apply</button>
			</Modal>
		</>
	)
}