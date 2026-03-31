<script setup lang="ts">
import { entries } from '@/utils/mapFunctions'
import { useAssetStore } from '../stores/assetStore'
import Thumbnail from './Thumbnail.vue'

const mode = defineModel<'level' | 'model'>('mode', { required: true })
const selectedCategory = defineModel<string | null>('selectedCategory', { required: true })
const selectedModel = defineModel<string | null>('selectedModel', { required: true })
const modelDataStore = useModelDataStore()
const assetStore = useAssetStore()
</script>

<template>
	<NTabs
		:value="selectedCategory ?? undefined"
		@update:value="(val) => (selectedCategory = val)"
	>
		<NTabPane
			v-for="(models, category) in assetStore.models"
			:key="category"
			:name="category"
			:tab="category"
		>
			<NScrollbar
				style="width: 100%"
				x-scrollable
			>
				<NList
					style="display: flex"
					hoverable
					:show-divider="false"
				>
					<NPopover
						v-for="[name, model] in entries(models).toSorted((a, b) => a[0].localeCompare(b[0]))"
						:key="name"
						:disabled="Object.keys(modelDataStore.modelData?.[category]?.[name]?.tags ?? {}).length === 0"
					>
						<template #trigger>
							<NListItem
								style="overflow: hidden; position: relative"
								:class="{ 'selected-model': selectedModel === name }"
								class="model"
								:bordered="selectedModel === name"
								@click="selectedModel = name"
							>
								<NEllipsis
									strong
									style="width: 100px"
								>
									{{ name }}
								</NEllipsis>
								<NFlex>
									<NIcon v-if="modelDataStore.modelData?.[category]?.[name]?.collider">
										<fa-cube />
									</NIcon>
									<NIcon v-if="Object.keys(modelDataStore.modelData?.[category]?.[name]?.tags ?? {}).length !== 0">
										<fa-tags />
									</NIcon>
								</NFlex>
								<NButton
									class="edit-button"
									circle
									size="small"
									style="position: absolute; bottom: 1rem; right: 1rem"
									@click="
										() => {
											mode = 'model'
											selectedModel = name
										}
									"
								>
									<template #icon>
										<NIcon>
											<Fa7SolidGear />
										</NIcon>
									</template>
								</NButton>
								<Thumbnail
									:thumbnail-key="`${category}-${name}`"
									:model
								/>
							</NListItem>
						</template>
						<NTag
							v-for="(value, tag) in modelDataStore.modelData?.[category]?.[name]?.tags ?? {}"
							:key="tag"
							type="error"
							:bordered="false"
						>
							{{ tag }} - {{ value }}
						</NTag>
					</NPopover>
				</NList>
			</NScrollbar>
		</NTabPane>
	</NTabs>
</template>

<style scoped>
.model:not(:hover) .edit-button {
	display: none;
}
.selected-model {
	background: hsl(0deg, 100%, 100%, 20%);
}
</style>
