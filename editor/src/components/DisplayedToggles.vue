<template>
	<NCard siwe="small">
		<NFlex vertical>
			<NFlex v-for="(val, key) in levelStore.displayed">
				<NButton
					
					:key
					text
					@click="levelStore.displayed[key] = !val"
				>
					<fa-eye v-if="val"></fa-eye>
					<fa-eye-slash v-else></fa-eye-slash>
				</NButton>
				{{ key }}
			</NFlex>
		</NFlex>
	</NCard>
</template>
<script setup lang="ts">
const levelStore = useLevelStore()
</script>
<style scoped></style>
