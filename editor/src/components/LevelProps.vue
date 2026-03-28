<script setup lang="ts">
const levelStore = useLevelStore()
</script>

<template>
	<NCard size="small">
		<div style="display:grid">
			<ResizeModal
				v-if="levelStore.levelData"
				:size="{ x: levelStore.levelData.sizeX, y: levelStore.levelData.sizeY }"
			/>
		</div>
	</NCard>
</template>

<style scoped></style>