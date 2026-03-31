<script setup lang="ts">
import { NButton, NCard, NInputGroup } from 'naive-ui'
import { useLevelStore } from '../stores/levelStore'

const levelStore = useLevelStore()
const mode = defineModel<'level' | 'model'>('mode', { required: true })
</script>

<template>
	<NCard
		size="small"
		title="Levels"
	>
		<div style="display: grid">
			<template
				v-for="level in levelStore.levels"
				:key="level"
			>
				<NInputGroup style="display: grid; grid-template-columns: 1fr auto">
					<NButton
						:secondary="levelStore.selectedLevel === level && mode === 'level'"
						@click="
							() => {
								mode = 'level'
								levelStore.selectedLevel = level
							}
						"
					>
						{{ level }}
					</NButton>
					<NButton @click="levelStore.rollback(level)">
						<template #icon>
							<NIcon>
								<fa-arrow-rotate-left />
							</NIcon>
						</template>
					</NButton>
				</NInputGroup>
			</template>
		</div>
	</NCard>
</template>

<style scoped></style>
