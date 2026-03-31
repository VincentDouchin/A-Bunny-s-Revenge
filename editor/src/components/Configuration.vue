<script setup lang="ts">
import { path } from '@tauri-apps/api'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { appDataDir } from '@tauri-apps/api/path'
import { open } from '@tauri-apps/plugin-dialog'
import { openPath } from '@tauri-apps/plugin-opener'
import { FOLDER } from '../lib/fileOperations'

const levelStore = useLevelStore()

const openFolder = async () => {
	const dir = await appDataDir()
	openPath(await path.join(dir, FOLDER))
}

const saveMode = ref<'local' | 'github'>('local')
const pushingChanges = ref<'in_progress' | 'success' | null>(null)

const pullLatest = async () => {
	const dir = await appDataDir()
	invoke('pull_latest_command', { repoPath: await path.join(dir, FOLDER) })
}
const localDir = useLocalStorage<string | null>('localDir', null)
const loggedIn = ref(false)

const save = async () => {
	await levelStore.save(localDir.value)
}

const pushChanges = async () => {
	if (pushingChanges.value !== null) return
	pushingChanges.value = 'in_progress'
	await pullLatest()
	await save()
	try {
		if (saveMode.value === 'github') {
			await invoke('create_pr_command', {
				repoPath: await path.join(await appDataDir(), FOLDER),
				baseBranch: 'main',
				commitMessage: 'Update level',
				prTitle: 'Update level',
				prBody: 'Update level',
			})
			// oxlint-disable-next-line no-alert
			alert('Changes pushed successfully!')
		}
		pushingChanges.value = 'success'
		setTimeout(() => (pushingChanges.value = null), 2000)
	} catch (err: any) {
		console.error(err)
		// oxlint-disable-next-line no-alert
		alert(`Failed to push changes: ${err}`)
	}
}
const configModalOpen = ref(false)
const loading = ref(false)
const userCode = ref('')
const verificationUri = ref('')
async function startLogin() {
	loading.value = true

	// Listen for device flow start
	const unlistenStart = await listen('device_flow_start', (event) => {
		const payload = event.payload as { user_code: string; verification_uri: string }
		userCode.value = payload.user_code
		verificationUri.value = payload.verification_uri
	})

	// Listen for success
	const unlistenSuccess = await listen('device_flow_success', () => {
		loading.value = false
		loggedIn.value = true
		configModalOpen.value = false
		unlistenStart()
		unlistenSuccess()
	})

	// Listen for errors
	const unlistenError = await listen('device_flow_error', (event) => {
		// oxlint-disable-next-line no-alert
		alert(`Login failed: ${event.payload}`)
		loading.value = false
		unlistenStart()
		unlistenSuccess()
		unlistenError()
	})

	// Trigger Tauri command
	await invoke('start_github_device_flow')
}

const selectFolder = async () => {
	const path = await open({
		multiple: false,
		directory: true,
	})
	localDir.value = path
}
</script>

<template>
	<NCard size="small">
		<NInputGroup style="display: grid; grid-template-columns: 1fr 1fr 1fr">
			<NButton @click="openFolder">
				<template #icon>
					<NIcon>
						<fa-folder-open />
					</NIcon>
				</template>
			</NButton>
			<NButton @click="pushChanges">
				<template #icon>
					<NIcon>
						<template v-if="pushingChanges === null">
							<fa-save v-if="saveMode === 'local'" />
							<fa-cloud-arrow-up v-else />
						</template>
						<fa-check v-else-if="pushingChanges === 'success'" />
						<NSpin
							v-else-if="pushingChanges === 'in_progress'"
							:size="15"
						/>
					</NIcon>
				</template>
			</NButton>
			<NButton @click="configModalOpen = !configModalOpen">
				<template #icon>
					<NIcon>
						<fa-gear />
					</NIcon>
				</template>
			</NButton>
		</NInputGroup>
	</NCard>
	<NModal
		v-if="configModalOpen"
		preset="card"
		:show="true"
		style="width: fit-content"
	>
		<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem">
			<NCard
				title="Github"
				:bordered="saveMode === 'github'"
			>
				<template #header-extra>
					<NButton
						:disabled="saveMode === 'github'"
						@click="saveMode = 'github'"
					>
						Activate
					</NButton>
				</template>
				<NSpace vertical>
					<NButton
						:disabled="loading || saveMode !== 'github'"
						@click="startLogin"
					>
						<fab-github />
						{{ loading ? 'Waiting for authorization...' : 'Login with GitHub' }}
					</NButton>

					<div v-if="userCode">
						<p>
							Go to
							<a
								:href="verificationUri"
								target="_blank"
								>{{ verificationUri }}</a
							>
							and enter the code:
						</p>
						<h2>{{ userCode }}</h2>
					</div>
					<NButton @click="pullLatest">
						<template #icon>
							<NIcon>
								<fa-cloud-arrow-down />
							</NIcon>
						</template>
						Pull latest
					</NButton>
				</NSpace>
			</NCard>
			<NCard
				title="Local"
				:bordered="saveMode === 'local'"
			>
				<template #header-extra>
					<NButton
						:disabled="saveMode === 'local'"
						@click="saveMode = 'local'"
					>
						Activate
					</NButton>
				</template>
				<NSpace vertical>
					<NButton
						with-icon
						@click="selectFolder"
					>
						<template #icon>
							<NIcon>
								<fa-folder-closed />
							</NIcon>
						</template>

						Select folder
					</NButton>
					<NEllipsis style="width: 10rem">
						{{ localDir }}
					</NEllipsis>
				</NSpace>
			</NCard>
		</div>
	</NModal>
</template>

<style scoped></style>
