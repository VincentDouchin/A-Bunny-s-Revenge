<script setup lang="ts">
import type { Object3D, QuaternionTuple, Vector3Like } from 'three/webgpu'
import type { ColliderData } from '../types'
import { Box3, Quaternion, Vector3 } from 'three/webgpu'

const props = defineProps<{
	model: string
	category: string
	name: string
	title: string
	complex: boolean
	mesh: Object3D
}>()
const emit = defineEmits<{
	(e: 'addCollider'): void
	(e: 'deleteCollider'): void
}>()
const assetStore = useAssetStore()
const collider = defineModel<ColliderData>('collider', { required: true })
const colliderShapes: Record<string, ColliderData['type']> = {
	Box: 'cuboid',
	Sphere: 'ball',
	Capsule: 'capsule',
	Cylinder: 'cylinder',
	Trimesh: 'trimesh',
	Link: 'link',
}
const colliderShapeOptions = computed(() => {
	return Object.entries(colliderShapes)
		.map(([label, value]) => ({ label, value }))
		.filter(({ value }) => props.complex === true || !['trimesh', 'link'].includes(value))
})
const type = ref<ColliderData['type'] | null>(null)
const linkedCategory = ref<string | null>(null)
const linkedModel = ref<string | null>(null)
const size = ref<{ x: number; y: number; z: number }>({ x: 1, y: 1, z: 1 })
const position = ref<{ x: number; y: number; z: number }>({ x: 0, y: 0, z: 0 })
const rotation = ref<QuaternionTuple>(new Quaternion().toArray())
onMounted(() => {
	if (collider.value) {
		type.value = collider.value.type
		if (collider.value.type === 'link') {
			linkedCategory.value = collider.value.category
			linkedModel.value = collider.value.model
		} else {
			linkedCategory.value = props.category
			if (collider.value.type !== 'trimesh') {
				size.value = collider.value.size
				position.value = collider.value.position
				rotation.value = collider.value.rotation as QuaternionTuple
			} else {
				position.value = { x: 0, y: 0, z: 0 }
			}
		}
	}
})

const categoryOptions = computed(() =>
	Object.keys(assetStore.models)
		.toSorted((a, b) => a.localeCompare(b))
		.map((value) => ({ value, label: value })),
)
const modelOptions = computed(() => {
	if (linkedCategory.value === null) {
		return []
	}
	return Object.keys(assetStore.models[linkedCategory.value])
		.filter((x) => x !== props.model)
		.toSorted((a, b) => a.localeCompare(b))
		.map((value) => ({ value, label: value }))
})

const getComputedSize = (shape: Exclude<ColliderData['type'], 'trimesh' | 'link'>) => {
	switch (shape) {
		case 'ball':
			return { x: size.value.x, y: size.value.x, z: size.value.x }
		case 'cylinder':
		case 'capsule':
			return { x: size.value.x, y: size.value.y, z: size.value.x }
		default:
			return { x: size.value.x, y: size.value.y, z: size.value.z }
	}
}

const newCollider = computed(() => {
	if (type.value === 'trimesh') {
		return { type: 'trimesh' }
	} else if (type.value === 'link') {
		if (linkedCategory.value && linkedModel.value && linkedModel.value in assetStore.models[linkedCategory.value]) {
			return { type: 'link', category: toRaw(linkedCategory.value), model: toRaw(linkedModel.value) }
		}
	} else if (type.value) {
		return {
			type: toRaw(type.value),
			size: toRaw(getComputedSize(type.value)),
			position: toRaw(position.value),
			rotation: toRaw(rotation.value),
		}
	}
	return undefined
})
watch(newCollider, (col) => {
	if (col) {
		collider.value = col as ColliderData
	}
})
const setAutoSize = () => {
	const box = new Box3().setFromObject(props.mesh)
	const sizeTemp = new Vector3()
	box.getSize(sizeTemp)
	if (type.value === 'capsule') {
		sizeTemp.x /= 2
		sizeTemp.y /= 2
	}
	const posTemp = new Vector3()
	box.getCenter(posTemp)
	size.value = { x: sizeTemp.x, y: sizeTemp.y, z: sizeTemp.z }
	position.value = { x: posTemp.x, y: posTemp.y - sizeTemp.y / 2, z: posTemp.z }
}
</script>

<template>
	<NCollapseItem
		:title="title"
		:name="name"
		:disabled="!collider"
	>
		<NSpace vertical>
			<NSelect
				v-model:value="type"
				:options="colliderShapeOptions"
			/>
			<template v-if="type === 'link'">
				<NInputGroup>
					<NInputGroupLabel> Category </NInputGroupLabel>
					<NSelect
						v-model:value="linkedCategory"
						filterable
						placeholder=""
						:options="categoryOptions"
					/>
				</NInputGroup>
				<NInputGroup>
					<NInputGroupLabel> Model </NInputGroupLabel>
					<NSelect
						v-model:value="linkedModel"
						filterable
						:disabled="linkedCategory === null"
						placeholder=""
						:options="modelOptions"
					/>
				</NInputGroup>
			</template>
			<NButton
				v-if="type !== 'trimesh' && type !== 'link'"
				style="width: 100%"
				@click="setAutoSize"
			>
				<template #icon>
					<NIcon>
						<fa-A />
					</NIcon>
				</template>
				Auto size
			</NButton>
			<NButton
				style="width: 100%"
				@click="emit('deleteCollider')"
			>
				<template #icon>
					<NIcon>
						<fa-trash />
					</NIcon>
				</template>
				Delete collider
			</NButton>
		</NSpace>
	</NCollapseItem>
</template>

<style scoped></style>
