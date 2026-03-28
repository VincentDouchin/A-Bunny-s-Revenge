<script setup lang="ts">
import type { Object3D } from 'three/webgpu'
import { onMounted, ref } from 'vue'
import { useThumbnailStore } from '../stores/thumbnailStore'
import ElementWrapper from './ElementWrapper.vue'

const props = defineProps<{
	thumbnailKey: string
	model: Object3D
}>()
const canvas = ref<HTMLCanvasElement | null>(null)
const thumbnailStore = useThumbnailStore()
onMounted(async () => {
	const c = await thumbnailStore.getThumbnail(props.thumbnailKey, props.model)
	if (c) {
		canvas.value = c
	}
})
</script>

<template>
	<ElementWrapper v-if="canvas" :el="canvas" />
</template>

<style scoped></style>