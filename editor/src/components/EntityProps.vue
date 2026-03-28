<script setup lang="ts">
const levelStore = useLevelStore()
</script>

<template>
	<NCard size="small">
		<NInputGroup style="display:grid;grid-template-columns: 1fr 1fr">
			<NButton @click="levelStore.selectedEntityId && levelStore.destroyEntity(levelStore.selectedEntityId) ">
				<template #icon>
					<NIcon>
						<fa-trash />
					</NIcon>
				</template>
			</NButton>
			<NButton>
				<template #icon>
					<NIcon>
						<fa-clone />
					</NIcon>
				</template>
			</NButton>
		</NInputGroup>
	</NCard>
</template>

<style scoped></style>