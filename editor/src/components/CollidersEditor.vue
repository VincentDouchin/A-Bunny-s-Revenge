<script setup lang="ts">
import type { HeaderClickInfo } from 'naive-ui/es/collapse/src/interface'
import type { ColliderData } from '../types'
import { Quaternion } from 'three/webgpu'

const props = defineProps<{
	category: string
	model: string
}>()
const assetStore = useAssetStore()
const modelDataStore = useModelDataStore()
const modelData = computed(() => modelDataStore.modelData?.[props.category]?.[props.model] ?? [])
const mesh = computed(() => assetStore.models?.[props.category]?.[props.model])
const colliderStore = useColliderStore()
const blankCollider = (): ColliderData => ({
	type: 'cuboid',
	size: { x: 1, y: 1, z: 1 },
	position: { x: 0, y: 0, z: 0 },
	rotation: new Quaternion().toArray(),
})
const addPrimaryCollider = () => {
	modelDataStore.modelData[props.category] ??= {}
	modelDataStore.modelData[props.category][props.model] ??= {}
	modelData.value.collider = blankCollider()
}
const deletePrimaryCollider = () => {
	modelData.value.collider = undefined
}
const addSecondaryCollider = () => {
	modelData.value.secondaryColliders ??= []
	modelData.value.secondaryColliders.push(blankCollider())
}
const deleteSecondaryCollider = (index: number) => {
	if (Array.isArray(modelData.value.secondaryColliders)) {
		modelData.value.secondaryColliders = modelData.value.secondaryColliders.filter((_x, i) => i !== index)
	}
}
const toggle = (header: HeaderClickInfo<'primary' | `secondary-${number}`>) => {
	if (header.name === colliderStore.selectedKey && header.expanded) {
		colliderStore.selectedCollider = null
	} else if (header.name === 'primary') {
		colliderStore.selectedCollider = 'primary'
	} else if (header.name.startsWith('secondary')) {
		const index = Number(header.name.split('-')[1])
		colliderStore.selectedCollider = 'secondary'
		colliderStore.selectedIndex = index
	}
}
</script>

<template>
	<NCard size="small" :segmented="{ footer: true }" title="Colliders">
		<NCollapse
			v-if="mesh"
			:expanded-names="colliderStore.selectedKey ?? ''"
			accordion
			@item-header-click="toggle"
		>
			<SingleColliderEditor
				v-if="modelData.collider"
				:key="`${category}-${model}`"
				v-model:collider="modelData.collider"
				:model="model"
				:category="category"
				name="primary"
				:complex="true"
				title="Primary"
				:mesh
				@add-collider="addPrimaryCollider"
				@delete-collider="deletePrimaryCollider"
			/>
			<template v-for="_secondaryCollider, i in modelData.secondaryColliders" :key="`${category}-${model}-${i}`">
				<SingleColliderEditor
					v-if="modelData.secondaryColliders?.[i]"
					v-model:collider="modelData.secondaryColliders[i]"
					:model="model"
					:category="category"
					:complex="false"
					:name="`secondary-${i}`"
					:title="`Secondary ${i}` "
					:mesh
					@delete-collider="deleteSecondaryCollider(i)"
				/>
			</template>
		</NCollapse>
		<template #footer>
			<NButton v-if="!modelData.collider" style="width:100%" @click="addPrimaryCollider">
				<template #icon>
					<NIcon>
						<fa-plus />
					</NIcon>
				</template>
				Add primary collider
			</NButton>
			<NButton style="width:100%" @click="addSecondaryCollider">
				<template #icon>
					<NIcon>
						<fa-plus />
					</NIcon>
				</template>
				Add secondary collider
			</NButton>
		</template>
	</NCard>
</template>

<style scoped></style>