<script setup lang="ts">
import type { Tags } from '@assets/tagsList'
import type { EditorTags } from '../types'

defineProps<{
	global: boolean
}>()
const tags = defineModel<Partial<Tags>>('tags', { default: () => ({}) })
const tagsStore = useTagsStore()
const tagsListOptions = computed(() => {
	return Object.keys(tagsStore.tagsList ?? {}).map((tag) => ({ label: tag, value: tag }))
})

const newTag = ref<string | null>(null)
const selectedTag = computed(() => {
	if (newTag.value && tagsStore.tagsList) {
		return tagsStore.tagsList[newTag.value]
	}
	return null
})
const tagStringValue = ref<string | null>(null)
const tagNumberValue = ref<number | null>(null)
watch(newTag, () => {
	tagStringValue.value = null
	tagNumberValue.value = null
})

const changeTagType = (name: string, type: EditorTags[string]['type']) => {
	if (!tagsStore.tagsList) return
	if (type === 'enum') {
		tagsStore.tagsList[name] = { type: 'enum', values: [] }
	} else {
		tagsStore.tagsList[name] = { type }
	}
}
const addTag = () => {
	if (!newTag.value || !selectedTag.value) return
	const key = newTag.value
	if (selectedTag.value.type === 'tag') {
		;(tags.value as any)[key] = true
	} else if (selectedTag.value.type === 'number' && tagNumberValue.value !== null) {
		;(tags.value as any)[key] = tagNumberValue.value
	} else if (tagStringValue.value !== null) {
		;(tags.value as any)[key] = tagStringValue.value
	}
	newTag.value = null
}
const isAddingTagDisabled = computed(() => {
	switch (selectedTag.value?.type) {
		case 'number':
			return tagNumberValue.value === null
		case 'tag':
			return false
		case 'enum':
		case 'string':
			return tagStringValue.value === null
		default:
			return true
	}
})
const openTagsListModal = ref(false)
const newTagName = ref<string | null>(null)
const createTag = () => {
	if (newTagName.value && tagsStore.tagsList) {
		tagsStore.tagsList[newTagName.value] = { type: 'tag' }
	}
}
</script>

<template>
	<NModal
		v-model:show="openTagsListModal"
		:animate="false"
		preset="card"
		title="Tags list"
		size="huge"
		:style="{ width: '50%', height: '40rem' }"
		transform-origin="center"
		content-scrollable
	>
		<NList>
			<template
				v-for="(tag, name) in tagsStore.tagsList"
				:key="name"
			>
				<NListItem>
					<NFlex vertical>
						{{ name }}
						<NDynamicTags
							v-if="tag.type === 'enum'"
							v-model:value="tag.values"
						/>
					</NFlex>
					<template #suffix>
						<NFlex :wrap="false">
							<NSelect
								:value="tag.type"
								style="width: 8rem"
								:options="['enum', 'string', 'number', 'tag'].map((value) => ({ value, label: value }))"
								@update:value="(type) => changeTagType(name, type)"
							/>
							<NButton @click="() => delete tagsStore.tagsList![name]">
								<template #icon>
									<NIcon>
										<fa-trash />
									</NIcon>
								</template>
							</NButton>
						</NFlex>
					</template>
				</NListItem>
			</template>
			<NListItem>
				<NInput
					v-model:value="newTagName"
					placeholder=""
				/>
				<template #suffix>
					<NButton
						:disabled="!newTagName"
						@click="createTag"
					>
						<template #icon>
							<NIcon>
								<fa-plus />
							</NIcon>
						</template>
						Create tag
					</NButton>
				</template>
			</NListItem>
		</NList>
	</NModal>
	<NCard
		size="small"
		:title="global ? 'Model tags' : 'Entity tags'"
	>
		<template #header-extra>
			<NButton
				circle
				@click="openTagsListModal = !openTagsListModal"
			>
				<template #icon>
					<NIcon>
						<fa-tags />
					</NIcon>
				</template>
			</NButton>
		</template>
		<NFlex>
			<template
				v-for="(value, tag) in tags"
				:key="tag"
			>
				<NTag
					:type="global ? 'error' : 'warning'"
					:bordered="false"
					closable
					@close="() => delete tags[tag]"
				>
					{{ tag }} - {{ value }}
				</NTag>
			</template>
		</NFlex>
		<template #footer>
			<NSelect
				v-model:value="newTag"
				placeholder="New tag"
				:options="tagsListOptions"
			/>
			<NInputGroup style="display: grid; grid-template-columns: 1fr auto">
				<NSelect
					v-if="selectedTag?.type === 'enum'"
					v-model:value="tagStringValue"
					placeholder=""
					:options="selectedTag.values.map((val) => ({ value: val, label: val }))"
				/>
				<NInput
					v-if="selectedTag?.type === 'string'"
					v-model:value="tagStringValue"
					placeholder=""
				/>
				<NInputNumber
					v-if="selectedTag?.type === 'number'"
					v-model:value="tagNumberValue"
					placeholder=""
				/>
				<NButton
					style="width: 100%"
					:disabled="isAddingTagDisabled"
					@click="addTag"
				>
					<template #icon>
						<NIcon>
							<fa-plus />
						</NIcon>
					</template>
				</NButton>
			</NInputGroup>
		</template>
	</NCard>
</template>

<style scoped></style>
