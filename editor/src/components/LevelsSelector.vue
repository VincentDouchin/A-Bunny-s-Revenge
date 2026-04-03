<script setup lang="ts">
import { NButton, NCard } from 'naive-ui'
import { createLevelFolder, saveLevelFile } from '../lib/fileOperations'
import { useLevelStore } from '../stores/levelStore'
import { LevelData } from '../types'

const levelStore = useLevelStore()
const mode = defineModel<'level' | 'model'>('mode', { required: true })
const showAddLevelModal = ref(false)
const newLevelName = ref('')
const blankLevel = (): LevelData => ({
	displacementScale: 10,
	entities: {},
	floorTexture: 'grass',
	instances: {},
	navMesh: null,
	sizeX: 100,
	sizeY: 100,
	grass: [],
})
const createLevel = async () => {
	await createLevelFolder(newLevelName.value, null)
	await saveLevelFile(newLevelName.value, blankLevel(), null)
	showAddLevelModal.value = false
	levelStore.selectedLevel = newLevelName.value
}
</script>

<template>
	<NModal
		preset="card"
		v-model:show="showAddLevelModal"
		title="Create level"
		placeholder=""
		style="width: fit-content"
	>
		<template #footer>
			<div style="display: grid; justify-items: flex-end">
				<NButton
					:disabled="newLevelName === ''"
					@click="createLevel"
				>
					<template #icon>
						<NIcon>
							<fa-plus></fa-plus>
						</NIcon>
					</template>
					Create
				</NButton>
			</div>
		</template>
		<NInput v-model:value="newLevelName"></NInput>
	</NModal>
	<NCard
		size="small"
		title="Levels"
	>
		<template #header-extra>
			<NButton
				text
				@click="showAddLevelModal = true"
			>
				<template #icon>
					<NIcon>
						<fa-plus></fa-plus>
					</NIcon>
				</template>
			</NButton>
		</template>
		<div style="display: grid">
			<template
				v-for="level in levelStore.levels"
				:key="level"
			>
				<NButton
					style="width: 100%"
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
			</template>
		</div>
	</NCard>
</template>

<style scoped></style>
