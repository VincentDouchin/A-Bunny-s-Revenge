<script setup lang="ts">
import { NButton, NCard } from 'naive-ui'

const levelStore = useLevelStore()
</script>

<template>
	<NCard
		size="small"
		title="Entities"
	>
		<div style="display: grid">
			<template
				v-for="(entity, id) in levelStore.levelEntities"
				:key="id"
			>
				<NInputGroup
					v-if="entity && entity !== true"
					style="display: grid; grid-template-columns: 1fr auto"
				>
					<NButton
						style="overflow: hidden"
						:secondary="levelStore.selectedEntityId === id"
						@click="levelStore.selectedEntityId = id"
					>
						<NEllipsis>{{ entity.value.category }} - {{ entity.value.model }}</NEllipsis>
					</NButton>
					<NButton @click="levelStore.destroyEntity(id)">
						<template #icon>
							<NIcon>
								<fa-trash />
							</NIcon>
						</template>
					</NButton>
				</NInputGroup>
			</template>
		</div>
	</NCard>
</template>

<style scoped></style>
