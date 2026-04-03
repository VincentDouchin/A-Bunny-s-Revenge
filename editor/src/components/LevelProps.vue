<script setup lang="ts">
const levelStore = useLevelStore()
</script>

<template>
	<NCard size="small">
		<NFlex vertical>
			<ResizeModal
				v-if="levelStore.levelData"
				:size="{ x: levelStore.levelData.sizeX, y: levelStore.levelData.sizeY }"
			/>
			<NButton @click="levelStore.rollback()">
				<template #icon>
					<NIcon>
						<fa-arrow-rotate-left />
					</NIcon>
				</template>
				Restore
			</NButton>
			<NButton @click="levelStore.destroy()">
				<template #icon>
					<NIcon>
						<fa-trash />
					</NIcon>
				</template>
				Destroy
			</NButton>
		</NFlex>
	</NCard>
	<NCard
		size="small"
		title="Nav mesh"
	>
		<NFlex vertical>
			<NButton @click="levelStore.addNavMesh">
				<template #icon>
					<NIcon>
						<fa-map></fa-map>
					</NIcon>
				</template>
				Generate navmesh
			</NButton>
			<NButton
				:secondary="levelStore.moveAnchor"
				@click="levelStore.moveAnchor = !levelStore.moveAnchor"
			>
				<template #icon>
					<fa-bullseye></fa-bullseye>
				</template>
				NavMesh Anchor
			</NButton>
			<NButton @click="levelStore.navMesh = null">
				<template #icon>
					<fa-trash></fa-trash>
				</template>
				Remove navMesh
			</NButton>
		</NFlex>
	</NCard>
</template>

<style scoped></style>
