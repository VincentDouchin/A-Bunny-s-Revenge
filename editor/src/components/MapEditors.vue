<script setup lang="ts">
const levelStore = useLevelStore()
const treeStore = useTreeStore()
const open = ref<string[]>([])
const height = ref(1)
</script>

<template>
	<NCard v-if="levelStore.levelData && levelStore.selectedLevel" :key="levelStore.selectedLevel" size="small">
		<NCollapse v-model:expanded-names="open" accordion display-directive="show">
			<SingleMapEditor
				:open
				map="heightMap"
				title="Height map"
				:level-data="levelStore.levelData"
				default-color="#FFFFFFF"
				erase-color="black"
				@update="() => levelStore.setGroundGeometry()"
			>
				<template #default="{ setColor }">
					Height
					<NSlider
						v-model:value="height"
						:max="100"
						@update:value="setColor(`hsl(0deg,0%,${height}%)`)"
					/>
					<template v-if="levelStore.levelData">
						Displacement scale
						<NSlider
							v-model:value="levelStore.levelData.displacementScale"
							:min="0"
						/>
					</template>
				</template>
			</SingleMapEditor>
			<SingleMapEditor
				:open
				map="treeMap"
				title="Trees"
				:level-data="levelStore.levelData"
				default-color="#00FF00"
				:enable-blur="false"
				:enable-transparency="false"
				@update="() => treeStore.getTreesData()"
			>
				<template #default="{ color, setColor }">
					<NInputGroup style="display:grid;grid-template-columns: 1fr 1fr">
						<NButton :secondary="color === '#00FF00'" @click="setColor('#00FF00')">
							<template #icon>
								<div class="square green" />
							</template>
							Trees
						</NButton>
						<NButton :secondary="color === '#FF0000'" @click="setColor('#FF0000')">
							<template #icon>
								<div class="square red" />
							</template>
							Transparent trees
						</NButton>
					</NInputGroup>
				</template>
			</SingleMapEditor>
			<SingleMapEditor
				:open
				map="waterMap"
				title="Water"
				:level-data="levelStore.levelData"
				default-color="#0000FF"
				:enable-blur="false"
				:enable-transparency="false"
				@update="levelStore.setGroundGeometry()"
			/>
			<SingleMapEditor
				:open
				map="pathMap"
				title="Paths"
				:level-data="levelStore.levelData"
				default-color="#FF0000"
				@update="levelStore.pathTexture && (levelStore.pathTexture.needsUpdate = true)"
			/>
			<SingleMapEditor
				:open
				map="grassMap"
				:enable-blur="false"
				:enable-transparency="false"
				title="Grass"
				:level-data="levelStore.levelData"
				default-color="#00FF00"
				@update="treeStore.setGrassModel()"
			/>
		</NCollapse>
	</NCard>
</template>

<style scoped>
.square {
	width: 1rem;
	height: 1rem;
}
.square.red {
	background: #ff0000;
}
.square.green {
	background: #00ff00;
}
</style>