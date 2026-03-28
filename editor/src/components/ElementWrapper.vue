<script setup lang="ts">
import type { CSSProperties } from 'vue'
import { useTemplateRef, watchEffect } from 'vue'

const props = defineProps<{
	el: HTMLElement
	style?: CSSProperties
}>()
const wrapper = useTemplateRef('wrapper')
watchEffect(() => {
	wrapper.value?.childNodes.forEach(c => c.remove())
	if (props.style) {
		for (const key in props.style) {
			(props.el.style as any)[key]	= (props.style as any)[key]
		}
	}
	wrapper.value && wrapper.value.appendChild(props.el)
})
</script>

<template>
	<div ref="wrapper" />
</template>

<style scoped></style>