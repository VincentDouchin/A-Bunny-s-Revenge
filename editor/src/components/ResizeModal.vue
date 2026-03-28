<script setup lang="ts">
import type { Vector2Like } from 'three'
import type { MapNames } from '../types'
import { NButton, NInputNumber, NModal } from 'naive-ui'
import { ref, watch } from 'vue'

export type AnchorX = 'left' | 'right' | 'center'
export type AnchorY = 'top' | 'bottom' | 'center'

const props = defineProps<{
	size: Vector2Like

}>()

// const emit = defineEmits<{
// 	(e: 'resize', anchorX: AnchorX, anchorY: AnchorY, mode: 'extend' | 'resize', size: Vector2Like): void
// }>()

const levelStore = useLevelStore()

const open = ref(false)
const anchorX = ref<AnchorX>('center')
const anchorY = ref<AnchorY>('center')
const mode = ref<'extend' | 'resize'>('extend')
const sizeX = ref(props.size.x)
const sizeY = ref(props.size.y)

watch(
	() => props.size,
	(newSize) => {
		sizeX.value = newSize.x
		sizeY.value = newSize.y
	},
)

interface GridCell { x: AnchorX, y: AnchorY, rotation?: string }

const gridCells: GridCell[] = [
	{ x: 'left', y: 'top', rotation: 'rotate(45deg)' },
	{ x: 'center', y: 'top' },
	{ x: 'right', y: 'top', rotation: 'rotate(-45deg)' },
	{ x: 'left', y: 'center' },
	{ x: 'center', y: 'center' },
	{ x: 'right', y: 'center' },
	{ x: 'left', y: 'bottom', rotation: 'rotate(-45deg)' },
	{ x: 'center', y: 'bottom' },
	{ x: 'right', y: 'bottom', rotation: 'rotate(45deg)' },
]

function isSelected(x: AnchorX, y: AnchorY) {
	return anchorX.value === x && anchorY.value === y
}

function setAnchor(x: AnchorX, y: AnchorY) {
	anchorX.value = x
	anchorY.value = y
}

const getOffsetX = (anchorX: AnchorX, newWidth: number, oldWidth: number) => {
	switch (anchorX) {
		case 'left': return 0
		case 'center': return Math.floor((newWidth - oldWidth) / 2)
		case 'right': return newWidth - oldWidth
	}
}
const getOffsetY = (anchorX: AnchorY, newHeight: number, oldHeight: number) => {
	switch (anchorX) {
		case 'top': return 0
		case 'center': return Math.floor((newHeight - oldHeight) / 2)
		case 'bottom': return newHeight - oldHeight
	}
}
const resize = (anchorX: AnchorX, anchorY: AnchorY, mode: 'extend' | 'resize', size: Vector2Like) => {
	const oldSize = { ...props.size }
	if (!oldSize || !levelStore.levelData) return
	const tempCanvas = document.createElement('canvas') as HTMLCanvasElement
	tempCanvas.width = size.x
	tempCanvas.height = size.y
	const ctx = tempCanvas.getContext('2d')!
	const offsetX = getOffsetX(anchorX, size.x, oldSize.x)
	const offsetY = getOffsetY(anchorY, size.y, oldSize.y)
	const newImages: Partial<Record<MapNames, HTMLCanvasElement>> = {}
	for (const name in levelStore.levelImages) {
		ctx.clearRect(0, 0, size.x, size.y)

		const canvas = levelStore.levelImages[name as MapNames]
		if (!canvas) continue
		if (mode === 'extend') {
			ctx.drawImage(canvas, offsetX, offsetY, oldSize.x, oldSize.y)
		} else {
			ctx.drawImage(canvas, 0, 0, size.x, size.y)
		}
		canvas.width = size.x
		canvas.height = size.y
		canvas.getContext('2d')!.drawImage(tempCanvas, 0, 0, size.x, size.y)
		newImages[name as MapNames] = canvas
	}
	levelStore.levelImages = newImages
	levelStore.levelData.sizeX = size.x
	levelStore.levelData.sizeY = size.y
	const { x: ow, y: oh } = oldSize
	const { x: nw, y: nh } = size

	const ox = anchorX === 'left' ? 0 : anchorX === 'right' ? nw - ow : (nw - ow) / 2
	const oy = anchorY === 'top' ? 0 : anchorY === 'bottom' ? nh - oh : (nh - oh) / 2

	const ocx = ow / 2
	const ocy = oh / 2
	const ncx = nw / 2
	const ncy = nh / 2
	for (const key in levelStore.levelEntities) {
		const entity = levelStore.levelEntities[key]
		const [x, y, z] = entity.value.position
		if (mode === 'extend') {
			const newX = (x + ocx + ox) - ncx
			const newZ = (z + ocy + oy) - ncy
			entity.value.position = [newX, y, newZ]
		}
		else {
			const sx = nw / ow
			const sy = nh / oh
			const newX = ((x + ocx) * sx) - ncx
			const newZ = ((z + ocy) * sy) - ncy
			entity.value.position = [newX, y, newZ]
		}
	}
}
function applyResize() {
	resize(anchorX.value, anchorY.value, mode.value, { x: sizeX.value, y: sizeY.value })
}
</script>

<template>
	<NButton style="width: 100%" @click="open = true">
		<template #icon>
			<fa-arrows-up-down-left-right />
		</template>
		Resize
	</NButton>

	<NModal v-model:show="open" preset="card" title="Resize" closable style="width:fit-content">
		<NSpace vertical>
			<div style="margin:0 auto;width: fit-content;">
				<NInputGroup class="resize-grid">
					<NButton
						v-for="cell in gridCells"
						:key="`${cell.x}-${cell.y}`"
						:type="isSelected(cell.x, cell.y) ? 'primary' : undefined"
						@click="setAnchor(cell.x, cell.y)"
					>
						<div :style="cell.rotation ? { transform: cell.rotation } : {}">
							<fa-arrow-up v-if="cell.x === 'center' && cell.y === 'top'" />
							<fa-arrow-down v-else-if="cell.x === 'center' && cell.y === 'bottom'" />
							<fa-arrow-left v-else-if="cell.x === 'left'" />
							<fa-arrow-right v-else-if="cell.x === 'right'" />
							<fa-arrows-up-down-left-right v-else />
						</div>
					</NButton>
				</NInputGroup>
			</div>
			<NInputGroup>
				<NInputGroupLabel>
					<NIcon>
						<fa-arrows-left-right />
					</NIcon>
				</NInputGroupLabel>
				<NInputNumber v-model:value="sizeX" />
			</NInputGroup>
			<NInputGroup>
				<NInputGroupLabel>
					<NIcon>
						<fa-arrows-up-down />
					</NIcon>
				</NInputGroupLabel>
				<NInputNumber v-model:value="sizeY" />
			</NInputGroup>
			<NTabs v-model:value="mode" type="segment">
				<NTab v-for="name in ['extend', 'resize']" :key="name" :name />
			</NTabs>
			<NButton type="primary" style="width: 100%;" @click="applyResize">
				Apply
			</NButton>
		</NSpace>
	</NModal>
</template>

<style scoped>
.resize-grid {
	display: grid;
	grid-template-columns: 1fr 1fr 1fr;
}
</style>