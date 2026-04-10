<script setup lang="ts">
import type { Object3D } from 'three/webgpu'
import type { LevelData } from '../types'
import { Bounds, MapControls, TransformControls } from '@tresjs/cientos'
import { useLoop, useTres } from '@tresjs/core'
import { SkeletonUtils } from 'three/addons'
import { texture } from 'three/tsl'
import { AmbientLight, CanvasTexture, ConeGeometry, MathUtils, MeshBasicNodeMaterial, Quaternion, Raycaster, Vector2, Vector3 } from 'three/webgpu'
import { GroundMaterial } from '@/shaders/groundMaterial'
import { WaterMaterial } from '@/shaders/waterMaterial'

const props = defineProps<{
	transformMode: 'translate' | 'scale' | 'rotate'
	selectedModel: string | null
	selectedCategory: string | null
}>()

const levelData = defineModel<Omit<LevelData, 'entities'>>('levelData', { required: true })

const selectedEntityId = defineModel<string | null>('selectedEntityId')
const assetStore = useAssetStore()
const levelStore = useLevelStore()
const modelDataStore = useModelDataStore()
const treeStore = useTreeStore()

const material = new GroundMaterial({
	grassNoiseTexture: new CanvasTexture(levelStore.grassNoise),
	groundTexture: toRaw(assetStore.assets!.textures.Dirt4_Dark),
	levelSize: new Vector2(levelData.value.sizeX, levelData.value.sizeY),
	rockTexture: toRaw(assetStore.assets!.textures.Rocks1_Light),
	level: null,
})

watchEffect(() => {
	if (levelStore.pathTexture) {
		material.level.value = levelStore.pathTexture
	}
})
watch(
	() => levelStore.grassNoise,
	() => (material.grassNoiseTexture = texture(new CanvasTexture(levelStore.grassNoise))),
)
const waterMaterial = computed(() => {
	if (levelStore.levelImages.waterMap) {
		return new WaterMaterial({}, new Vector2(levelData.value.sizeX, levelData.value.sizeY))
	}
	return null
})

const light = computed(() => new AmbientLight())

const entityRefs = shallowRef<Record<string, Object3D>>({})

const dragging = ref(false)
const updateSelectedEntity = () => {
	if (!selectedEntityId.value || !levelStore.levelData) return
	const obj = entityRefs.value[selectedEntityId.value]
	if (props.transformMode === 'translate') {
		levelStore.levelEntities[selectedEntityId.value].value.position = obj.position.toArray()
	}
}

const { renderer, camera } = useTres()
const { onBeforeRender } = useLoop()
const { x: mouseX, y: mouseY } = useMouse()

const mousePosition = computed(() => {
	const box = renderer.domElement.getBoundingClientRect()
	if (mouseX.value >= box.left && mouseX.value <= box.right && mouseY.value >= box.top && mouseY.value <= box.bottom) {
		return {
			x: ((mouseX.value - box.left) / (box.right - box.left)) * 2 - 1,
			y: -((mouseY.value - box.top) / (box.bottom - box.top)) * 2 + 1,
		}
	}
	return null
})
const ray = new Raycaster()

const tempModel = computed(() => {
	if (!props.selectedModel || selectedEntityId.value || !props.selectedCategory || !props.selectedModel) return null
	const model = assetStore.models?.[props.selectedCategory]?.[props.selectedModel]
	if (!model) return null
	const clone = SkeletonUtils.clone(model)
	const globalScale = modelDataStore.modelData?.[props.selectedCategory]?.[props.selectedModel]?.scale
	if (globalScale) {
		clone.scale.multiply(new Vector3(...globalScale))
	}
	return clone
})

const anchorRef = ref<Object3D | null>(null)

const updateAnchorPos = () => {
	if (anchorRef.value) {
		const pos = anchorRef.value.position
		levelStore.navMeshAnchor = {
			x: pos.x,
			y: pos.z,
		}
	}
}

useEventListener(renderer.domElement, 'click', (e) => {
	if (mousePosition.value && camera.value) {
		ray.setFromCamera(new Vector2(mousePosition.value.x, mousePosition.value.y), camera.value)
		if (tempModel.value && levelStore.groundMesh) {
			const intersection = ray.intersectObject(levelStore.groundMesh)
			if (e.button === 0 && intersection?.[0]?.point && props.selectedCategory && props.selectedModel && !selectedEntityId.value) {
				const id = MathUtils.generateUUID()
				levelStore.levelEntities[id] = ref({
					category: props.selectedCategory,
					model: props.selectedModel,
					grounded: true,
					position: intersection[0].point.toArray(),
					rotation: new Quaternion().toArray(),
					scale: [1, 1, 1],
				})
				selectedEntityId.value = id
			}
		} else {
			ray.setFromCamera(new Vector2(mousePosition.value.x, mousePosition.value.y), camera.value)
			for (const key in entityRefs.value) {
				const entity = entityRefs.value[key]
				if (ray.intersectObject(entity, true).length > 0) {
					selectedEntityId.value = key
					return
				}
			}
		}
	}
})

onBeforeRender(() => {
	if (mousePosition.value && camera.value && levelStore.groundMesh && tempModel.value) {
		ray.setFromCamera(new Vector2(mousePosition.value.x, mousePosition.value.y), camera.value)
		const intersection = ray.intersectObject(levelStore.groundMesh)
		if (intersection?.[0]?.point) {
			tempModel.value.position.copy(intersection[0].point)
		}
	}
})
</script>

<template>
	<primitive
		:object="light"
		dispose
	/>

	<primitive
		v-if="tempModel"
		:object="tempModel"
		dispose
	/>

	<template v-if="levelStore.moveAnchor">
		<TresGroup
			:scale="10"
			:position="[levelStore.navMeshAnchor.x, 0, levelStore.navMeshAnchor.y]"
			:ref="(e) => (anchorRef = e as any)"
		>
			<TresMesh
				:position="[0, 0.5, 0]"
				:rotation="[Math.PI, 0, 0]"
				:geometry="new ConeGeometry(0.5, 1)"
				:material="new MeshBasicNodeMaterial()"
			>
			</TresMesh>
		</TresGroup>
		<TransformControls
			v-if="anchorRef"
			:object="anchorRef"
			mode="translate"
			:showY="false"
			@dragging="(e) => (dragging = e)"
			@mouse-up="updateAnchorPos"
		/>
	</template>

	<TresPerspectiveCamera :position="[0, 50, 25]" />
	<TransformControls
		v-if="selectedEntityId && entityRefs[selectedEntityId]"
		:object="entityRefs[selectedEntityId]"
		:mode="transformMode"
		@dragging="(e) => (dragging = e)"
		@mouse-up="updateSelectedEntity"
	/>

	<template v-if="levelStore.levelData">
		<primitive
			v-if="levelStore.mouseMesh"
			:object="levelStore.mouseMesh"
			:rotation="[-Math.PI / 2, 0, 0]"
			:position="[0, -levelStore.levelData.displacementScale / 2, 0]"
			dispose
		/>
		<primitive
			v-if="levelStore.navMeshHelper && levelStore.displayed.navMesh"
			:object="levelStore.navMeshHelper"
			:position="[0, 2, 0]"
			dispose
		/>
		<primitive
			v-if="treeStore.grassModel && levelStore.displayed.grass"
			:object="treeStore.grassModel"
			dispose
		/>
		<primitive
			v-if="treeStore.treesModels && levelStore.displayed.trees"
			:object="treeStore.treesModels"
			dispose
		/>

		<primitive
			v-if="treeStore.boundaryGrid?.obj && levelStore.displayed.boundary"
			:object="treeStore.boundaryGrid.obj"
			dispose
		/>
		<primitive
			v-if="treeStore.boundaryMeshes?.group && levelStore.displayed.colliders"
			:object="treeStore.boundaryMeshes?.group"
			dispose
		/>
		<primitive
			v-if="levelStore.entitiesBoundaryMeshes?.group && levelStore.displayed.colliders"
			:object="levelStore.entitiesBoundaryMeshes?.group"
			dispose
		/>
		<Bounds
			clip
			use-mounted
			:offset="0.2"
		>
			<TresMesh
				:ref="(e: any) => (levelStore.groundMesh = e)"
				:material="material"
				:rotation="[-Math.PI / 2, 0, 0]"
				:position="[0, -levelStore.levelData.displacementScale / 2, 0]"
			>
				<primitive
					v-if="levelStore.groundGeometry"
					:object="levelStore.groundGeometry"
				/>
				<TresPlaneGeometry
					v-else
					:args="[levelData.sizeX, levelData.sizeY, levelData.sizeX, levelData.sizeY]"
				/>
			</TresMesh>
		</Bounds>
		<TresMesh
			v-if="waterMaterial"
			:rotation="[-Math.PI / 2, 0, 0]"
			:position="[0, -1, 0]"
			:material="waterMaterial"
		>
			<TresPlaneGeometry :args="[levelData.sizeX, levelData.sizeY]" />
		</TresMesh>
		<template v-if="levelStore.displayed.models">
			<template
				v-for="(entity, id) in levelStore.levelEntities"
				:key="id"
			>
				<EntityRenderer
					v-if="entity"
					:id
					v-model:entity-refs="entityRefs"
					:entity="entity.value"
				/>
			</template>
		</template>
	</template>
	<MapControls
		v-if="!dragging"
		:rotate-speed="0.5"
		:enable-damping="false"
	/>
	<TresAxesHelper />
</template>
