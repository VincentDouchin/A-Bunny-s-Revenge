import type { Accessor, JSX } from 'solid-js'
import type { Atom } from 'solid-use/atom'

import type { Vec2 } from 'three'
import { faEraser, faPen, faRotateLeft, faRotateRight } from '@fortawesome/free-solid-svg-icons'
import Fa from 'solid-fa'
import { createMemo, onMount, Show } from 'solid-js'
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
	open,
	mouseCanvas,
	eraseColor = null,
	drawing,
	realTimeUpdate = true,
	// globalMode,
	// globalPosition,
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
	open: Atom<string | null>
	mouseCanvas: (canvas: HTMLCanvasElement | null) => void
	eraseColor?: string | null
	drawing: Atom<boolean>
	realTimeUpdate?: boolean
	globalMode: Atom<'eraser' | 'brush' | null>
	globalPosition: Atom<Vector2 | null>
}) {
	const initialUrl = atom('')
	const getContext = (el: Accessor<HTMLCanvasElement | null>) => createMemo(() => {
		const canvas = el()
		if (canvas) {
			return canvas.getContext('2d', { willReadFrequently: true })!
		}
		return null
	})

	const history = createMutable<string[]>([])
	const future = createMutable<string[]>([])
	const strokeCanvas = atom<HTMLCanvasElement | null>(null)
	const strokeCtx = getContext(strokeCanvas)
	const finalCanvas = atom<HTMLCanvasElement | null>(null)
	const finalCtx = getContext(finalCanvas)
	const cursorCanvas = atom<HTMLCanvasElement | null>(null)
	const cursorCtx = getContext(cursorCanvas)

	const radius = atom(5)
	const transparencyValue = atom(100)
	const blurValue = atom(0)

	const mode = atom<'eraser' | 'brush' | null>(null)
	const color = atom(defaultColor)

	const tempCanvas = createMemo(() => {
		const el = document.createElement('canvas')
		el.width = levelSize().x
		el.height = levelSize().y
		return el.getContext('2d', { willReadFrequently: true })!
	})

	const getMousePosition = (e: PointerEvent) => {
		const canvas = strokeCanvas()
		if (canvas) {
			const box = canvas.getBoundingClientRect()
			return new Vector2((e.clientX - box.left) / box.width, (e.clientY - box.top) / box.height)
		}
		return null
	}
	const relativeMousePosition = (pos: Vec2) => {
		return levelSize().clone().multiply(pos)
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

	let lastPos: Vec2 | null = null
	let isDrawing = false

	const clearCanvas = (ctx: CanvasRenderingContext2D) => {
		ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
	}

	const drawMouse = (pos: Vec2) => {
		const ctx = cursorCtx()
		if (ctx && pos) {
			clearCanvas(ctx)
			ctx.globalCompositeOperation = 'source-over'
			drawLine(ctx, pos, { x: pos.x + 1, y: pos.y + 1 })
			mouseCanvas(mode() ? strokeCanvas() : cursorCanvas())
		}
	}

	const startStroke = (pos: Vec2, tool: 'eraser' | 'brush') => {
		isDrawing = true
		mode(tool)
		future.length = 0
		lastPos = pos
	}
	const moveStroke = (pos: Vec2) => {
		drawMouse(pos)
		const strokeCtxValue = strokeCtx()
		if (strokeCtxValue && lastPos && isDrawing) {
			drawLine(strokeCtxValue, lastPos, pos)
			lastPos = pos
		}
		const finalCtxValue = finalCtx()
		if (realTimeUpdate && finalCtxValue && strokeCtxValue) {
			clearCanvas(tempCanvas())
			tempCanvas().globalCompositeOperation = 'source-over'
			tempCanvas().drawImage(finalCtxValue.canvas, 0, 0, levelSize().x, levelSize().y)
			tempCanvas().globalAlpha = transparencyValue() / 100
			tempCanvas().globalCompositeOperation = (mode() === 'brush' || eraseColor) ? 'source-over' : 'destination-out'
			tempCanvas().drawImage(strokeCtxValue.canvas, 0, 0, levelSize().x, levelSize().y)
			tempCanvas().globalAlpha = 1
			setCanvas(tempCanvas().canvas)
		}
	}
	const endStroke = () => {
		const strokeCtxValue = strokeCtx()
		const finalCtxValue = finalCtx()
		const cursorCtxValue = cursorCtx()
		if (strokeCtxValue && finalCtxValue && cursorCtxValue) {
			if (isDrawing) {
				isDrawing = false
				lastPos = null
				finalCtxValue.globalAlpha = transparencyValue() / 100
				finalCtxValue.globalCompositeOperation = (mode() === 'brush' || eraseColor) ? 'source-over' : 'destination-out'
				finalCtxValue.drawImage(strokeCtxValue.canvas, 0, 0, levelSize().x, levelSize().y)
				finalCtxValue.globalAlpha = 1
				setCanvas(finalCtxValue.canvas)
				const url = finalCtxValue.canvas.toDataURL()
				dataUrl(url)
				history.push(url)
				mode(null)
			}
			clearCanvas(strokeCtxValue)
			clearCanvas(cursorCtxValue)
			mouseCanvas(cursorCtxValue.canvas)
		}
	}

	const eraseCanvas = () => {
		const ctx = finalCtx()
		if (!ctx) return
		if (eraseColor) {
			ctx.fillStyle = eraseColor
			ctx.fillRect(0, 0, levelSize().x, levelSize().y)
		} else {
			ctx.clearRect(0, 0, levelSize().x, levelSize().y)
		}
		setCanvas(ctx.canvas)
		const url = ctx.canvas.toDataURL()
		dataUrl(url)
		history.push(url)
	}

	onMount(async () => {
		initialUrl(dataUrl())
		const finalContextValue = finalCtx()
		if (finalContextValue) {
			const img = await loadImage(dataUrl())
			finalContextValue.drawImage(img, 0, 0)
			setCanvas(finalContextValue.canvas)
		}
	})

	const undo = async () => {
		const last = history.pop()

		if (last) {
			future.push(last)
		}
		const prev = history.at(-1)
		const finalCtxValue = finalCtx()
		if (finalCtxValue) {
			const img = await loadImage(prev || initialUrl())
			clearCanvas(finalCtxValue)
			finalCtxValue.drawImage(img, 0, 0)
			setCanvas(finalCtxValue.canvas)
		}
	}
	const redo = async () => {
		const last = future.pop()
		if (last) {
			history.push(last)
		}
		const finalCtxValue = finalCtx()
		if (finalCtxValue && last) {
			const img = await loadImage(last)
			clearCanvas(finalCtxValue)
			finalCtxValue.drawImage(img, 0, 0)
			setCanvas(finalCtxValue.canvas)
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
					<button onClick={undo} disabled={history.length === 0}><Fa icon={faRotateLeft}></Fa></button>
					<button onClick={redo} disabled={future.length === 0}><Fa icon={faRotateRight}></Fa></button>
				</div>
				<div
					class="map-container"
					onContextMenu={e => e.preventDefault()}
					onPointerDown={(e) => {
						const pos = getMousePosition(e)
						if (pos) startStroke(relativeMousePosition(pos), e.buttons === 1 ? 'brush' : 'eraser')
					}}
					onPointerMove={(e) => {
						const pos = getMousePosition(e)
						if (pos) moveStroke(relativeMousePosition(pos))
					}}
					onPointerUp={endStroke}
					onPointerLeave={endStroke}
				>
					<canvas
						class="mouse"
						ref={el => cursorCanvas(el)}
						width={levelSize().x}
						height={levelSize().y}
					/>
					<canvas
						ref={el => finalCanvas(el)}
						width={levelSize().x}
						height={levelSize().y}
					/>
					<canvas
						ref={el => strokeCanvas(el)}
						onContextMenu={e => e.preventDefault()}
						style={{ 'opacity': transparencyValue() / 100, 'mix-blend-mode': mode() === 'eraser' ? 'exclusion' : 'normal' }}
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