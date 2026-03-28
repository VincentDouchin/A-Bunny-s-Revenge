<script setup lang="ts">
import type { Tags } from '@assets/tagsList'
import { init } from '@dimforge/rapier3d-compat'
import { darkTheme } from 'naive-ui'

const levelStore = useLevelStore()
const assetStore = useAssetStore()
const modelDataStore = useModelDataStore()
const thumbnailStore = useThumbnailStore()
const colliderStore = useColliderStore()
const tagsStore = useTagsStore()
const loaded = ref(false)
onMounted(async () => {
	await assetStore.init()
	await modelDataStore.init()
	await thumbnailStore.init()
	await levelStore.init()
	await tagsStore.init()
	await init()
	loaded.value = true
})

const hideTags = useLocalStorage('hideTags', false)
const mode = useLocalStorage<'level' | 'model'>('mode', 'level')
const selectedCategory = useLocalStorage<null | string>('selectedCategory', null)
const selectedModel = useLocalStorage<null | string>('selectedModel', null)
const transformMode = ref<'translate' | 'rotate' | 'scale'>('translate')
useEventListener('keydown', (e) => {
	switch (e.code) {
		case 'KeyG':transformMode.value = 'translate'
			break
		case 'KeyS':transformMode.value = 'scale'
			break
		case 'KeyR':transformMode.value = 'rotate'
			break
	}
})
const selectedModelTags = computed(() => {
	if (selectedCategory.value && selectedModel.value) {
		return modelDataStore.modelData?.[selectedCategory.value]?.[selectedModel.value]?.tags ?? null
	}
	return null
})
const updateModelTags = (tags: Partial<Tags>) => {
	if (selectedCategory.value && selectedModel.value) {
		modelDataStore.modelData[selectedCategory.value] ??= {}
		modelDataStore.modelData[selectedCategory.value][selectedModel.value] ??= {}
		modelDataStore.modelData[selectedCategory.value][selectedModel.value].tags = tags
	}
}

watch(() => levelStore.selectedEntityId, (id) => {
	if (id !== null && (!levelStore.levelData || !(id in levelStore.levelEntities))) {
		levelStore.selectedEntityId = null
	}
})
</script>

<template>
	<NConfigProvider :theme="darkTheme">
		<NGlobalStyle />
		<div v-if="loaded" class="wrapper">
			<div class="container">
				<div class="top">
					<NScrollbar style="min-height: 0;height: 100%;">
						<div style="display: grid; gap: 1rem;flex-direction: column; grid-template-rows:auto auto">
							<Configuration />
							<LevelsSelector v-model:mode="mode" />
							<LevelProps v-if="levelStore.levelData && mode === 'level'" />
							<LevelEntitiesList
								v-if="levelStore.levelData && mode === 'level'"
							/>
							<TagsEditor
								v-if="selectedModel"
								:global="true"
								:tags="selectedModelTags ?? {}"
								@update:tags="updateModelTags"
							/>
						</div>
					</NScrollbar>
					<NCard
						size="small" style="min-height: 0;height: 100%;"
						@click.right="() => {
							levelStore.selectedEntityId = null
							colliderStore.selectedCollider = null
							selectedModel = null
						}"
					>
						<div style="position:relative;height: 100%;overflow: clip;">
							<div style="position:absolute;z-index:1">
								<NFlex>
									<NFlex v-if="mode === 'level'">
										<NSwitch v-model:value="hideTags" />
										<NText>
											Hide tags
										</NText>
									</NFlex>
									<NInputGroup v-if="colliderStore.selectedKey || levelStore.selectedEntityId">
										<NButton :secondary="transformMode === 'translate'" @click="transformMode = 'translate'">
											<template #icon>
												<NIcon>
													<fa-arrows />
												</NIcon>
											</template>
											G
										</NButton>
										<NButton :secondary="transformMode === 'scale'" @click="transformMode = 'scale'">
											<template #icon>
												<NIcon>
													<fa-maximize />
												</NIcon>
											</template>
											S
										</NButton>
										<NButton :secondary="transformMode === 'rotate'" @click="transformMode = 'rotate'">
											<template #icon>
												<NIcon>
													<fa-arrows-rotate />
												</NIcon>
											</template>
											R
										</NButton>
									</NInputGroup>
								</NFlex>
							</div>
							<Renderer>
								<LevelRenderer
									v-if="levelStore.levelData && assetStore.assets !== null && mode === 'level'"
									v-model:selected-entity-id="levelStore.selectedEntityId"
									:level-data="levelStore.levelData"
									:hide-tags="hideTags"
									:transform-mode
									:selected-model
									:selected-category
								/>
								<ModelRenderer
									v-if="mode === 'model' && selectedCategory && selectedModel"
									:category="selectedCategory"
									:model="selectedModel"
									:transform-mode
								/>
							</Renderer>
						</div>
					</NCard>
					<NScrollbar style="min-height: 0;height: 100%;">
						<CollidersEditor
							v-if="mode === 'model' && selectedCategory && selectedModel"
							:category="selectedCategory"
							:model="selectedModel"
						/>
						<MapEditors
							v-if="mode === 'level' && !levelStore.selectedEntityId"
							:key="levelStore.selectedLevel ?? ''"
						/>
						<EntityProps
							v-if="levelStore.selectedEntityId"
							:selected-entity-id="levelStore.selectedEntityId"
						/>
					</NScrollbar>
				</div>
				<NCard class="bottom" size="small" style="min-width:0;width: 100%">
					<ModelSelector
						:key="`${selectedCategory}-${selectedModel}`"
						v-model:mode="mode"
						v-model:selected-category="selectedCategory"
						v-model:selected-model="selectedModel"
					/>
				</NCard>
			</div>
		</div>
	</NConfigProvider>
</template>

<style scoped>
:global(body) {
	margin: 0;
}
.wrapper {
	position: fixed;
	inset: 0;
	padding: 1rem;
}
.container {
	display: grid;
	grid-template-rows: 3fr 1fr;
	height: 100%;
	width: 100%;
	gap: 1rem;
}
.top {
	display: grid;
	grid-template-columns: 1fr 4fr 1fr;
	gap: 1rem;
	min-height: 0;
}
:global(canvas) {
	image-rendering: pixelated;
}
</style>