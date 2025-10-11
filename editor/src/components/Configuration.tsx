import type { Atom } from 'solid-use/atom'
import { faGithub } from '@fortawesome/free-brands-svg-icons'
import { faCloudArrowUp, faDownload, faExclamationTriangle, faSpinner } from '@fortawesome/free-solid-svg-icons'
import { path } from '@tauri-apps/api'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { appDataDir } from '@tauri-apps/api/path'
import { BaseDirectory, exists, mkdir, remove } from '@tauri-apps/plugin-fs'
import Fa from 'solid-fa'
import { createSignal, onCleanup, onMount, Show } from 'solid-js'
import { css } from 'solid-styled'
import atom from 'solid-use/atom'
import { Modal } from './Modal'

export default function GithubDeviceLogin({ onLoggedIn }: { onLoggedIn: () => void }) {
	const [userCode, setUserCode] = createSignal('')
	const [verificationUri, setVerificationUri] = createSignal('')
	const [loading, setLoading] = createSignal(false)

	async function startLogin() {
		setLoading(true)

		// Listen for device flow start
		const unlistenStart = await listen('device_flow_start', (event) => {
			const payload = event.payload as { user_code: string, verification_uri: string }
			setUserCode(payload.user_code)
			setVerificationUri(payload.verification_uri)
		})

		// Listen for success
		const unlistenSuccess = await listen('device_flow_success', () => {
			setLoading(false)
			onLoggedIn()
			unlistenStart()
			unlistenSuccess()
		})

		// Listen for errors
		const unlistenError = await listen('device_flow_error', (event) => {
			// eslint-disable-next-line no-alert
			alert(`Login failed: ${event.payload}`)
			setLoading(false)
			unlistenStart()
			unlistenSuccess()
			unlistenError()
		})

		// Trigger Tauri command
		await invoke('start_github_device_flow')
	}

	css/* css */`
	.login-button{
		display: flex;
		place-items: center;
	}
	.icon{
		margin-right: 0.5rem
	}
	`
	return (
		<div>
			<button onClick={startLogin} disabled={loading()} class="login-button">
				<div class="icon">
					<Fa icon={faGithub}></Fa>
				</div>
				{loading() ? 'Waiting for authorization...' : 'Login with GitHub'}
			</button>

			{userCode() && (
				<div>
					<p>
						Go to
						<a href={verificationUri()} target="_blank">{verificationUri()}</a>
						{' '}
						and enter the code:
					</p>
					<h2>{userCode()}</h2>
				</div>
			)}
		</div>
	)
}

export function Configuration({ folder, reload, repoCloned }: {
	folder: string
	reload: (folder: string) => void
	repoCloned: Atom<boolean>
}) {
	const authModalOpen = atom(false)

	const status = atom<'cloning' | 'done' | null>(null)
	const error = atom<string | null>(null)
	const progress = atom(0)
	const loggedIn = atom(false)
	const downloadModalOpen = atom(false)

	onMount(async () => {
		const unListed = await listen<boolean>('login_valid', (e) => {
			loggedIn(e.payload)
			unListed()
		})
		invoke('validate_github_token_command')
	})

	const pullLatest = async (folder: string) => {
		const dir = await appDataDir()
		invoke('pull_latest_command', { repoPath: await path.join(dir, folder) })
	}

	const cloneRepo = async (destination: string) => {
		status('cloning')
		error(null)
		progress(0)

		const dir = await appDataDir()

		// --- Set up event listeners ---
		const unlistenProgress = await listen<number>('clone_progress', (event) => {
			progress(event.payload)
		})

		const unlistenDone = await listen<string>('clone_done', () => {
			status('done')
			progress(100)
			setTimeout(() => {
				status(null)
				progress(0)
			}, 2000)
		})

		const unlistenError = await listen<string>('clone_error', (event) => {
			console.error('❌', event.payload)
			error(event.payload)
		})

		try {
			const folderExists = await exists(destination, { baseDir: BaseDirectory.AppData })
			if (folderExists) await remove(destination, { baseDir: BaseDirectory.AppData, recursive: true })
			await mkdir(destination, { baseDir: BaseDirectory.AppData })

			await invoke('clone_repo_command', {
				repoPath: await path.join(dir, destination),
			})
			reload(destination)
		} catch (err) {
			console.error('❌ Failed to start clone:', err)
			error(String(err))
		}

		onCleanup(() => {
			unlistenProgress()
			unlistenDone()
			unlistenError()
		})
		downloadModalOpen(false)
	}
	const pushChanges = async () => {
		await pullLatest(folder)
		try {
			await invoke('commit_and_push', {
				repoPath: await path.join(await appDataDir(), folder),
				branch: 'main',
				commitMessage: 'Update level',
			})
			// alert('Changes pushed successfully!')
		} catch (err) {
			console.error(err)
			// alert(`Failed to push changes: ${err}`)
		}
	}

	const openDownloadModal = async () => {
		if (repoCloned()) {
			downloadModalOpen(true)
		} else {
			downloadModalOpen(true)
			await cloneRepo(folder)
			repoCloned(true)
		}
	}

	css/* css */`
	.configuration-title{
		display: grid;
		place-items: center;
	}
	.icon-container {
		display: flex;
		place-items: center;
		gap: 0.5rem;
	}
	.download-button{
		display: grid;
		place-items: center;
		width: 100%;
	}
	.error {
		padding: 0.5rem;
		border: solid 2px red;
		color: red;
		margin: 0.5rem;
	}
	.progress{
		display: flex;
		padding: 0.5rem;
		gap: 0.5rem;
		place-items:center;
	}
	.modal-container{
		position: fixed;
		margin: auto;
		inset: 0;
		pointer-events: none;
	}
	.modal{
		margin: auto;
		width: 50dvw;
		top: 20dvh;
		z-index: 1;
		pointer-events: all;
		background: var(--color-1);
		position: relative
	}
	.modal-content{
		display: grid;
		grid-template-columns: 2fr 5fr;
		gap: 2rem;
		padding: 2rem;
	}
	.close-button{
		position: absolute;
		top:0.5rem;
		right: 0.5rem;
		font-size: 1.5rem;
		width: 1.5rem;
		height: 1.5rem;
		cursor: pointer;
	}
	.close-button:hover{
		color: grey;
	}
	.token-input{
		display: grid;
		grid-template-columns: 1fr auto;
		gap: 1rem;
	}
	.config-buttons{
		display: grid;
		grid-template-columns: 1fr 1fr 1fr
	}
	`
	return (
		<>
			<section class="config-buttons">

				<button onClick={pushChanges} title="Upload changes">
					<Fa size="lg" icon={faCloudArrowUp}></Fa>
				</button>
				<Modal
					trigger={(
						<button onClick={() => authModalOpen(true)}>
							<Fa size="lg" icon={faGithub} color={loggedIn() ? 'white' : 'red'}></Fa>
						</button>
					)}
					open={authModalOpen}
				>
					<GithubDeviceLogin onLoggedIn={() => {
						loggedIn(true)
						authModalOpen(false)
					}}
					/>
				</Modal>
				<Modal
					trigger={(
						<button onClick={openDownloadModal}>
							<Fa size="lg" icon={faDownload} color={repoCloned() ? 'white' : 'red'}></Fa>
						</button>
					)}
					open={downloadModalOpen}
				>
					<Show when={status() === null}>
						<div>You will lose all your changes</div>
						<div>Are you sure you want to continue?</div>
						<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
							<button onClick={() => downloadModalOpen(false)}>Cancel</button>
							<button onClick={() => cloneRepo(folder)}>Download repo</button>
						</div>
					</Show>
					<Show when={status() !== null}>
						<Show when={error()}>
							<div class="error">
								<div class="icon-container">
									<Fa icon={faExclamationTriangle}></Fa>
									Error
								</div>
								{error()}
								<button onClick={() => cloneRepo(folder)}>Retry</button>
							</div>
						</Show>
						<Show when={status() && !error()}>
							<div class="progress">
								<Fa icon={faSpinner} pulse></Fa>
								<div>
									{progress().toFixed(0)}
									%
								</div>
								<div>{status()}</div>
							</div>
						</Show>
					</Show>
				</Modal>
			</section>
			{/* <Show when={configuration()}>
				<Portal mount={document.body}>
					<div class="modal-container">
						<section class="modal">
							<div class="close-button" onClick={() => configuration(false)}>
								<Fa icon={faXmark}></Fa>
							</div>
							<div class="title">
								Configuration
							</div>
							<div class="modal-content">

								<div>{loggedIn() ? 'logged in' : 'not logged in'}</div>
								<button onClick={() => cloneRepo(folder)} class="download-button" disabled={status() !== null}>
									<div class="icon-container">
										<Fa icon={faDownload}></Fa>
										Download repo
									</div>
								</button>
								<div>
									<Show when={error()}>
										<div class="error">
											<div class="icon-container">
												<Fa icon={faExclamationTriangle}></Fa>
												Error
											</div>
											{error()}
										</div>
									</Show>
									<Show when={status() && !error()}>
										<div class="progress">
											<Fa icon={faSpinner} spin></Fa>
											<div>
												{progress().toFixed(0)}
												%
											</div>
											<div>{status()}</div>
										</div>
									</Show>
								</div>
							</div>
						</section>
					</div>
				</Portal>
			</Show> */}
		</>
	)
}