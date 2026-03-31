<script setup lang="ts">
import type { TresRendererSetupContext } from '@tresjs/core'
import { TresCanvas } from '@tresjs/core'
import { ACESFilmicToneMapping, SRGBColorSpace, WebGPURenderer } from 'three/webgpu'
import { toValue } from 'vue'

const createWebGPURenderer = (ctx: TresRendererSetupContext) => {
	const renderer = new WebGPURenderer({
		canvas: toValue(ctx.canvas),
		alpha: true,
		antialias: true,
	})
	renderer.debug.checkShaderErrors = false
	renderer.outputColorSpace = SRGBColorSpace
	renderer.toneMapping = ACESFilmicToneMapping
	renderer.toneMappingExposure = 0.8
	return renderer
}
</script>

<template>
	<TresCanvas
		render-mode="on-demand"
		:clear-alpha="0"
		:renderer="createWebGPURenderer"
	>
		<slot />
	</TresCanvas>
</template>

<style scoped></style>
