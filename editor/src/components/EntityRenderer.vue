<script setup lang="ts">
import type { LevelEntity } from '../types'
import { Html } from '@tresjs/cientos'
import { useThemeVars } from 'naive-ui'
import { SkeletonUtils } from 'three/addons'
import { Euler, Group, Object3D, Quaternion } from 'three/webgpu'
import { range } from '@/utils/mapFunctions'

const props = defineProps<{
	entity: LevelEntity
	id: string
	hideTags: boolean
}>()

const entityRefs = defineModel<Record<string, Object3D>>('entityRefs', { required: true })

onUnmounted(() => {
	delete entityRefs.value[props.id]
})
const modelDataStore = useModelDataStore()
const assetStore = useAssetStore()
const themeVars = useThemeVars()
const scale = computed(() => {
	const globalScale = modelDataStore.modelData?.[props.entity.category]?.[props.entity.model]?.scale
	if (globalScale) {
		return globalScale.map((s, i) => s * props.entity.scale[i]) as [number, number, number]
	}
	return props.entity.scale
})

const model = ref(new Object3D())
watch(
	() => props.entity,
	() => {
		const src = assetStore.models?.[props.entity.category]?.[props.entity.model]
		if (!src) return
		const group = new Group()
		const clone = ('animations' in (assetStore.assets as any)?.[props.entity.category]?.[props.entity.model])
			? SkeletonUtils.clone(src)
			: src.clone()
		group.add(clone)
		if (props.entity.grid) {
			for (let x = 0; x <= props.entity.grid.repetitionX; x++) {
				for (let y = 0; y <= props.entity.grid.repetitionY; y++) {
					if (!(x === 0 && y === 0)) {
						const repetition = src.clone()
						repetition.position.set(props.entity.grid.spacingX * x, 0, props.entity.grid.spacingY * y)
						group.add(repetition)
					}
				}
			}
		}
		model.value = group
	},
	{ deep: true, immediate: true },
)
const rotation = computed(() => new Euler().setFromQuaternion(new Quaternion().fromArray(props.entity.rotation)).toArray())
</script>

<template>
	<primitive
		:ref="(e:Object3D) => entityRefs[id] = e"
		:object="model"
		:rotation="rotation"
		:scale="scale"
		:position="entity.position"
		dispose
	>
		<!-- @click="selectedEntityId = id" -->
		<Html v-if="!hideTags && entity.tags && Object.keys(entity.tags).length !== 0" center>
			<NTag
				v-for="value, tag in entity.tags"
				:key="tag"
				:bordered="false"
				strong
				:color="{ textColor: 'white', color: themeVars.warningColorSuppl }"
				size="tiny"
			>
				{{ tag }}-{{ value }}
			</NTag>
		</Html>
		<!-- <template v-if="entity.grid && assetStore.models?.[entity.category]?.[entity.model]">
			<template v-for="x in range<number>(0, entity.grid.repetitionX)">
				<template v-for="y in range<number>(0, entity.grid.repetitionY)" :key="`${x}-${y}`">
					<template v-if="!(x === 0 && y === 0)">
						<primitive
							:object="SkeletonUtils.clone(assetStore.models?.[entity.category]?.[entity.model])"
							:position="[entity.grid.spacingX * x, 0, entity.grid.spacingY * y]"
							dispose
						/>
					</template>
				</template>
			</template>
		</template> -->
	</primitive>
</template>

<style scoped></style>