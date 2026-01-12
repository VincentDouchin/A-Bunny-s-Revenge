import type { Accessor, JSX } from 'solid-js'
import type { Atom } from 'solid-use/atom'

import type { Vec2 } from 'three'
import { faEraser, faPen, faRotateLeft, faRotateRight } from '@fortawesome/free-solid-svg-icons'
import Fa from 'solid-fa'
import { createEffect, createMemo, on, onCleanup, onMount, Show } from 'solid-js'
import { createMutable } from 'solid-js/store'
import { css } from 'solid-styled'
import atom from 'solid-use/atom'
import { Vector2 } from 'three'
import { loadImage } from '../../../src/global/assetLoaders'
import { RangeInput } from './RangeInput'

export function MapEditor({
	name,
	setCanvas,
	levelSize,
	dataUrl,
	children,
	transparency = true,
	blur = true,
	defaultColor = '#000000',
	source,
	open,
	mouseCanvas,
	eraseColor = null,
	drawing,
	realTimeUpdate = true,
	globalMode,
	globalPosition,
}: {
	name: string
	backgroundColor?: string
	setCanvas: (canvas: HTMLCanvasElement) => void
	levelSize: Accessor<Vector2>
	dataUrl: Atom<string>
	children?: (color: Atom<string>) => JSX.Element
	transparency?: boolean
	blur?: boolean
	defaultColor?: string
	source: Atom<string>
	open: Atom<string | null>
	mouseCanvas: (canvas: HTMLCanvasElement | null) => void
	eraseColor?: string | null
	drawing: Atom<boolean>
	realTimeUpdate?: boolean
	globalMode: Atom<'eraser' | 'brush' | null>
	globalPosition: Atom<Vector2 | null>
}) {
	const getContext = (el: Accessor<HTMLCanvasElement | null>) => createMemo(() => {
		const canvas = el()
		if (canvas) {
			return canvas.getContext('2d')!
		}
		return null
	})

	const history = createMutable<string[]>([])
	const future = createMutable<string[]>([])
	const canvasElement = atom<HTMLCanvasElement | null>(null)
	const finalCanvas = atom<HTMLCanvasElement | null>(null)
	const context = getContext(canvasElement)
	const finalContext = getContext(finalCanvas)
	const canvasMouse = atom<HTMLCanvasElement | null>(null)
	const mouseContext = getContext(canvasMouse)

	createEffect(on(dataUrl, (url) => {
		if (!history.includes(url)) {
			history.push(url)
		}
	}))
	const position = atom<Vector2 | null>(null)
	const radius = atom(5)
	const transparencyValue = atom(100)
	const blurValue = atom(0)

	const mode = atom<'eraser' | 'brush' | null>(null)
	const color = atom(defaultColor)

	const getMousePosition = (e: PointerEvent) => {
		const canvas = canvasElement()
		if (canvas) {
			const box = canvas.getBoundingClientRect()
			return new Vector2((e.clientX - box.left) / box.width, (e.clientY - box.top) / box.height)
		}
		return null
	}
	const relativeMousePosition = createMemo(() => {
		const pos = position()
		if (pos) {
			return pos.clone().multiply(levelSize())
		}
		return null
	})

	onMount(() => {
		document.addEventListener('pointermove', getMousePosition)
	})
	onCleanup(() => {
		document.removeEventListener('pointermove', getMousePosition)
	})

	createEffect(() => {
		if (drawing() && open() === name) {
			position(globalPosition())
		}
	})

	const tempCanvas = createMemo(() => {
		const el = document.createElement('canvas')
		el.width = levelSize().x
		el.height = levelSize().y
		return el.getContext('2d')!
	})

	const eraseCanvas = () => {
		const ctx = finalContext()
		if (!ctx) return
		if (eraseColor) {
			ctx.fillStyle = eraseColor
			ctx.fillRect(0, 0, levelSize().x, levelSize().y)
		} else {
			ctx.clearRect(0, 0, levelSize().x, levelSize().y)
		}
		setCanvas(ctx.canvas)
		dataUrl(ctx.canvas.toDataURL())
	}

	const drawLine = (ctx: CanvasRenderingContext2D, start: Vec2, end: Vec2) => {
		ctx.strokeStyle = (mode() === 'eraser' && eraseColor) ? eraseColor : color()
		ctx.lineJoin = 'round'
		ctx.lineWidth = radius()
		ctx.filter = `blur(${(blurValue()) * radius()}px)`
		ctx.imageSmoothingEnabled = true
		ctx.beginPath()

		ctx.moveTo(start.x, start.y)
		ctx.lineTo(end.x, end.y)
		ctx.closePath()
		ctx.stroke()
	}

	const drawMouse = (pos: Vector2) => {
		const el = canvasMouse()
		const ctx = mouseContext()
		if (ctx && el && pos) {
			ctx.clearRect(0, 0, el.width, el.height)
			ctx.globalCompositeOperation = 'source-over'
			drawLine(ctx, pos, { x: pos.x + 1, y: pos.y + 1 })
			mouseCanvas(mode() ? canvasElement() : canvasMouse())
		}
	}

	createEffect(on(relativeMousePosition, (pos, lastPos) => {
		if (open() !== name) return
		if (drawing()) {
			mode(globalMode())
		}
		if (pos && !lastPos) {
			future.length = 0
		}
		if (pos && lastPos) {
			drawMouse(pos)
			const ctx = context()
			const finalCtx = finalContext()

			if (mode() && ctx && finalCtx) {
				drawLine(ctx, lastPos, pos)
				if (realTimeUpdate) {
					tempCanvas().clearRect(0, 0, levelSize().x, levelSize().y)
					tempCanvas().globalCompositeOperation = 'source-over'
					tempCanvas().drawImage(finalCtx.canvas, 0, 0, levelSize().x, levelSize().y)
					tempCanvas().globalAlpha = transparencyValue() / 100
					tempCanvas().globalCompositeOperation = (mode() === 'brush' || eraseColor) ? 'source-over' : 'destination-out'
					tempCanvas().drawImage(ctx.canvas, 0, 0, levelSize().x, levelSize().y)
					tempCanvas().globalAlpha = 1
					setCanvas(tempCanvas().canvas)
				}
			}
		}
		if (!pos && lastPos) {
			const mouseCtx = mouseContext()
			if (mouseCtx) {
				mouseCtx.clearRect(0, 0, levelSize().x, levelSize().y)
				mouseCanvas(mouseCtx.canvas)
			}
			if (mode()) {
				const canvas = canvasElement()
				const ctx = context()
				const finalCtx = finalContext()
				const finalC = finalCanvas()
				if (canvas && finalCtx && ctx && finalC) {
					finalCtx.globalAlpha = transparencyValue() / 100
					finalCtx.globalCompositeOperation = (mode() === 'brush' || eraseColor) ? 'source-over' : 'destination-out'
					finalCtx.drawImage(ctx.canvas, 0, 0, levelSize().x, levelSize().y)
					finalCtx.globalAlpha = 1
					ctx.clearRect(0, 0, levelSize().x, levelSize().y)
					dataUrl(finalC.toDataURL())
					setCanvas(finalC)
				}
				globalMode(null)
				mode(null)
			}
		}
	}))

	createEffect(on(source, async () => {
		const img = await loadImage(dataUrl())
		const ctx = finalContext()
		const canvas = finalCanvas()
		if (ctx && canvas) {
			ctx.drawImage(img, 0, 0, levelSize().x, levelSize().y)
			setCanvas(canvas)
			dataUrl(canvas.toDataURL())
		}
	}))

	const goBack = async () => {
		const last = history.pop()
		if (last) {
			future.push(last)
		}
		const ctx = finalContext()
		const prev = history.at(-1)
		const canvas = finalCanvas()
		if (ctx && prev && canvas) {
			const img = await loadImage(prev)
			if (ctx) {
				ctx.clearRect(0, 0, levelSize().x, levelSize().y)
				ctx.drawImage(img, 0, 0)
			}
			dataUrl(prev)
			setCanvas(canvas)
		}
	}
	const goForward = async () => {
		const last = future.pop()
		if (last) {
			history.push(last)
		}
		const ctx = finalContext()
		const prev = history.at(-1)
		const canvas = finalCanvas()
		if (ctx && prev && canvas) {
			const img = await loadImage(prev)
			if (ctx) {
				ctx.clearRect(0, 0, levelSize().x, levelSize().y)
				ctx.drawImage(img, 0, 0)
			}
			dataUrl(prev)
			setCanvas(canvas)
		}
	}
	const setOpen = () => {
		if (open() === name) {
			open(null)
		} else {
			open(name)
		}
	}

	css/* css */`
	.map-container{
		width: 100%;
		background: ${eraseColor ?? 'repeating-conic-gradient(#808080 0 25%, #0000 0 50%) 50% / 2rem 2rem'};
		display: grid;
		overflow-y: auto;
		height: 100%;
	}
	:global(.map-container > *){
		width: 100%;
		display: grid;
		grid-row: 1;
		grid-column: 1;
	}
	.mouse{
		z-index: 100;	
	}
	.controls{
		display: grid;
	}
	.map-title{
		cursor: pointer;
	}
	.map-editor-buttons{
		display: grid;
		grid-template-columns: repeat(4, 1fr);
	}
	.hidden{
		display: none;
	}
	
	`
	return (
		<section class="map-editor">
			<div class="map-title">
				<div class="title" onClick={setOpen}>
					{name}
				</div>

			</div>

			<div classList={{ hidden: open() !== name }}>
				<div class="map-editor-buttons">
					<button onClick={() => drawing(!drawing())} classList={{ selected: drawing() }}><Fa icon={faPen}></Fa></button>
					<button onClick={eraseCanvas}><Fa icon={faEraser}></Fa></button>
					<button onClick={goBack} disabled={history.length === 0}><Fa icon={faRotateLeft}></Fa></button>
					<button onClick={goForward} disabled={future.length === 0}><Fa icon={faRotateRight}></Fa></button>
				</div>
				<div
					class="map-container"
					onContextMenu={e => e.preventDefault()}
					onPointerDown={(e) => {
						position(getMousePosition(e))
						mode(e.buttons === 1 ? 'brush' : 'eraser')
					}}
					onPointerMove={e => position(getMousePosition(e))}
					onPointerUp={() => position(null)}
					onPointerLeave={() => position(null)}
				>
					<canvas
						ref={el => finalCanvas(el)}
						width={levelSize().x}
						height={levelSize().y}
					/>
					<canvas
						ref={el => canvasElement(el)}
						onContextMenu={e => e.preventDefault()}
						style={{ 'opacity': transparencyValue() / 100, 'mix-blend-mode': mode() === 'eraser' ? 'exclusion' : 'normal' }}
						width={levelSize().x}
						height={levelSize().y}
					/>

					<canvas
						class="mouse"
						ref={el => canvasMouse(el)}
						width={levelSize().x}
						height={levelSize().y}

					/>

				</div>

				<div class="controls">
					<div style="min-height: 0px">
						{children && children(color)}
						<Show when={transparency}>
							<RangeInput value={transparencyValue} name="Opacity" />
						</Show>
						<Show when={blur}>
							<RangeInput value={blurValue} name="Blur" max={2} step={0.1} />
						</Show>
						<RangeInput value={radius} name="Radius" />
					</div>
				</div>
			</div>
		</section>

	)
}