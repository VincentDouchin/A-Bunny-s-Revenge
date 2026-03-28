<script setup lang="ts">
import type { Vector2Like } from 'three'
import type { LevelData, MapNames } from '../types'
import { Vector2 } from 'three'
import { loadImage } from '@/global/assetLoaders'
import { getScreenBuffer } from '@/utils/buffer'

const props = withDefaults(defineProps<{
	map: MapNames
	title: string
	levelData: Omit<LevelData, 'entities'>
	open: string[]
	realTimeUpdate?: boolean
	eraseColor?: string
	defaultColor: string
	enableTransparency?: boolean
	enableBlur?: boolean
}>(), {
	realTimeUpdate: false,
	enableTransparency: true,
	enableBlur: true,
})

const emit = defineEmits<{
	(e: 'update'): void
}>()

const transparency = useLocalStorage(`${props.map}-transparency`, 100)
const blur = useLocalStorage(`${props.map}-blur`, 0)
const radius = useLocalStorage(`${props.map}-radius`, 5)
const color = useLocalStorage(`${props.map}-color`, props.defaultColor ?? '#FFFFFF')
const initialUrl = useLocalStorage<string | null>(`${props.map}-initialUrl`, null)
const mode = ref<'eraser' | 'brush' | null>(null)

const history = useLocalStorage<string[]>(`${props.map}-history`, [])
const future = useLocalStorage<string[]>(`${props.map}-future`, [])

const levelStore = useLevelStore()
const x = computed(() => props.levelData.sizeX)
const y = computed(() => props.levelData.sizeY)
const img = computed(() => levelStore.levelImages[props.map])
const cursorCanvas = useTemplateRef<HTMLCanvasElement>('cursorCanvasRef')
const strokeCanvas = useTemplateRef<HTMLCanvasElement>('strokeCanvasRef')
const cursorCanvasCtx = computed(() => cursorCanvas.value?.getContext('2d'))
const strokeCanvasCtx = computed(() => strokeCanvas.value?.getContext('2d'))
const finalCanvasCtx = computed(() => img.value?.getContext('2d'))

const init = () => {
	const canvas = getScreenBuffer(x.value, y.value).canvas
	levelStore.levelImages[props.map] = canvas
}

const setCanvas = (ctx: CanvasRenderingContext2D) => {
	levelStore.levelImages[props.map] = ctx.canvas
	levelStore.saveImageDebounced(ctx.canvas, props.map)
	emit('update')
}

const tempCanvas = computed(() => {
	const el = document.createElement('canvas')
	el.width = x.value
	el.height = y.value
	return el.getContext('2d', { willReadFrequently: true })!
})

const getMousePosition = (e: PointerEvent) => {
	if (strokeCanvas.value) {
		const box = strokeCanvas.value.getBoundingClientRect()
		return new Vector2((e.clientX - box.left) / box.width, (e.clientY - box.top) / box.height)
	}
	return null
}
const relativeMousePosition = (pos: Vector2Like) => {
	return {
		x: x.value * pos.x,
		y: y.value * pos.y,
	}
}
const drawLine = (ctx: CanvasRenderingContext2D, start: Vector2Like, end: Vector2Like) => {
	ctx.strokeStyle = (mode.value === 'eraser' && props.eraseColor) ? props.eraseColor : color.value
	ctx.lineJoin = 'round'
	ctx.lineWidth = radius.value
	ctx.filter = `blur(${(blur.value) * radius.value}px)`
	ctx.imageSmoothingEnabled = true
	ctx.beginPath()

	ctx.moveTo(start.x, start.y)
	ctx.lineTo(end.x, end.y)
	ctx.closePath()
	ctx.stroke()
}

let lastPos: Vector2Like | null = null
let isDrawing = false

const clearCanvas = (ctx: CanvasRenderingContext2D) => {
	ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
}

const drawMouse = (pos: Vector2Like) => {
	if (cursorCanvasCtx.value && pos) {
		clearCanvas(cursorCanvasCtx.value)
		cursorCanvasCtx.value.globalCompositeOperation = 'source-over'
		drawLine(cursorCanvasCtx.value, pos, { x: pos.x + 1, y: pos.y + 1 })
		// mouseCanvas.value = mode.value ? strokeCanvas.value : cursorCanvas.value
	}
}

const startStroke = (pos: Vector2Like, tool: 'eraser' | 'brush') => {
	isDrawing = true
	mode.value = tool
	future.value.length = 0
	lastPos = pos
}
const moveStroke = (pos: Vector2Like) => {
	drawMouse(pos)
	if (strokeCanvasCtx.value && lastPos && isDrawing) {
		drawLine(strokeCanvasCtx.value, lastPos, pos)
		lastPos = pos
	}
	if (props.realTimeUpdate && finalCanvasCtx.value && strokeCanvasCtx.value) {
		clearCanvas(tempCanvas.value)
		tempCanvas.value.globalCompositeOperation = 'source-over'
		tempCanvas.value.drawImage(finalCanvasCtx.value.canvas, 0, 0, x.value, y.value)
		tempCanvas.value.globalAlpha = transparency.value / 100
		tempCanvas.value.globalCompositeOperation = (mode.value === 'brush' || props.eraseColor) ? 'source-over' : 'destination-out'
		tempCanvas.value.drawImage(strokeCanvasCtx.value.canvas, 0, 0, x.value, y.value)
		tempCanvas.value.globalAlpha = 1
		setCanvas(tempCanvas.value)
	}
}
const endStroke = () => {
	if (strokeCanvasCtx.value && finalCanvasCtx.value && cursorCanvasCtx.value) {
		if (isDrawing) {
			isDrawing = false
			lastPos = null
			finalCanvasCtx.value.globalAlpha = transparency.value / 100
			finalCanvasCtx.value.globalCompositeOperation = (mode.value === 'brush' || props.eraseColor) ? 'source-over' : 'destination-out'
			finalCanvasCtx.value.drawImage(strokeCanvasCtx.value.canvas, 0, 0, x.value, y.value)
			finalCanvasCtx.value.globalAlpha = 1
			setCanvas(finalCanvasCtx.value)
			const url = finalCanvasCtx.value.canvas.toDataURL()
			history.value.push(url)
			mode.value = null
		}
		clearCanvas(strokeCanvasCtx.value)
		clearCanvas(cursorCanvasCtx.value)
		// mouseCanvas(cursorCtxValue.canvas)
	}
}

const eraseCanvas = () => {
	if (!finalCanvasCtx.value) return
	if (props.eraseColor) {
		finalCanvasCtx.value.fillStyle = props.eraseColor
		finalCanvasCtx.value.fillRect(0, 0, x.value, y.value)
	} else {
		finalCanvasCtx.value.clearRect(0, 0, x.value, y.value)
	}
	setCanvas(finalCanvasCtx.value)
	const url = finalCanvasCtx.value.canvas.toDataURL()
	history.value.push(url)
}

const undo = async () => {
	const last = history.value.pop()

	if (last) {
		future.value.push(last)
	}
	const prev = history.value.at(-1)
	const url = prev || initialUrl.value
	if (finalCanvasCtx.value && url) {
		const img = await loadImage(url)
		clearCanvas(finalCanvasCtx.value)
		finalCanvasCtx.value.drawImage(img, 0, 0)
		setCanvas(finalCanvasCtx.value)
	}
}
const redo = async () => {
	const last = future.value.pop()
	if (last) {
		history.value.push(last)
	}
	if (finalCanvasCtx.value && last) {
		const img = await loadImage(last)
		clearCanvas(finalCanvasCtx.value)
		finalCanvasCtx.value.drawImage(img, 0, 0)
		setCanvas(finalCanvasCtx.value)
	}
}

watchEffect(() => {
	if (initialUrl.value === null && img.value) {
		initialUrl.value = img.value.toDataURL()
	}
})
const destroy = () => {
	eraseCanvas()
	levelStore.destroyMap(props.map)
}
</script>

<template>
	<NCollapseItem :name="map" :title="title">
		<NFlex vertical>
			<NEmpty v-if="!img">
				<template #extra>
					<NButton @click="init">
						Add map
					</NButton>
				</template>
			</NEmpty>
			<template v-else>
				<NInputGroup style="display:grid;grid-template-columns: 1fr 1fr 1fr 1fr 1fr;">
					<NButton @click="undo">
						<template #icon>
							<NIcon>
								<fa-arrow-rotate-left />
							</NIcon>
						</template>
					</NButton>
					<NButton :disabled="future.length === 0" @click="redo">
						<template #icon>
							<NIcon>
								<fa-arrow-rotate-right />
							</NIcon>
						</template>
					</NButton>
					<NButton @click="levelStore.resetMap(map)">
						<template #icon>
							<NIcon>
								<fa-clock-rotate-left />
							</NIcon>
						</template>
					</NButton>
					<NButton @click="eraseCanvas">
						<template #icon>
							<NIcon>
								<fa-eraser />
							</NIcon>
						</template>
					</NButton>
					<NButton @click="destroy">
						<template #icon>
							<NIcon>
								<fa-trash />
							</NIcon>
						</template>
					</NButton>
				</NInputGroup>
				<div
					class="map-container"
					:style="{ background: eraseColor }"
					@contextmenu="e => e.preventDefault()"
					@pointerdown="(e) => {
						const pos = getMousePosition(e)
						if (pos) startStroke(relativeMousePosition(pos), e.buttons === 1 ? 'brush' : 'eraser')
					}"
					@pointermove="(e) => {
						const pos = getMousePosition(e)
						if (pos) moveStroke(relativeMousePosition(pos))
					}"
					@pointerup="endStroke"
					@pointerleave="endStroke"
				>
					<canvas
						ref="cursorCanvasRef"
						class="mouse"
						:style="{ opacity: transparency / 100 }"
						:width="x" :height="y"
						style="width:100%;z-index:2"
					/>
					<ElementWrapper
						:el="img"
						:style="{ width: '100%' }"
					/>
					<canvas
						ref="strokeCanvasRef"
						:style="{ 'opacity': transparency / 100, 'mix-blend-mode': mode === 'eraser' ? 'exclusion' : 'normal' }"
						:width="x" :height="y"
						style="width:100%"
					/>
				</div>

				Radius
				<NSlider v-model:value="radius" :max="100" />
				<template v-if="enableBlur">
					Blur
					<NSlider v-model:value="blur" :max="2" :step="0.1" />
				</template>
				<template v-if="enableTransparency">
					Opacity
					<NSlider v-model:value="transparency" :max="100" />
				</template>
				<slot :color="color" :set-color="(c:string) => color = c" />
			</template>
		</NFlex>
	</NCollapseItem>
</template>

<style scoped>
.map-container {
	width: 100%;
	background: repeating-conic-gradient(#808080 0 25%, #0000 0 50%) 50% / 2rem 2rem;
	display: grid;
	overflow-y: auto;
	height: 100%;
}
:global(.map-container > *) {
	width: 100%;
	display: grid;
	grid-row: 1;
	grid-column: 1;
}
</style>