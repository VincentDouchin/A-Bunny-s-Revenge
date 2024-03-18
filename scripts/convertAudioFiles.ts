import { createWriteStream } from 'node:fs'
import { unlink } from 'node:fs/promises'
import { glob } from 'glob'
import type { PluginOption } from 'vite'
import { path as ffmpegPath } from '@ffmpeg-installer/ffmpeg'
import ffmpeg from 'fluent-ffmpeg'

const launchScript = async (filePath?: string) => {
	if (!filePath || ((filePath.includes('assets\\') && ['mp3', 'wav'].includes(filePath.split('.').at(-1) ?? '')))) {
		console.log('converting audio files')
		const audioFiles = filePath ? [filePath] : await glob('./assets/*/*.{wav,mp3}')
		for (const path of audioFiles) {
			ffmpeg.setFfmpegPath(ffmpegPath)
			const outputPath = path.replace(/(?:wav|mp3)/g, 'ogg')
			const outStream = createWriteStream(outputPath)

			ffmpeg()
				.input(path)
				.audioQuality(96)
				.toFormat('ogg')
				.on('error', error => console.log(`Encoding Error: ${error.message}`))
				.on('exit', () => console.log('Audio recorder exited'))
				.on('close', () => console.log('Audio recorder closed'))
				.on('end', () => {
					console.log('Audio Transcoding succeeded !')
					// unlink(path)
				})
				.pipe(outStream, { end: true })
		}
	}
}

export const convertAudioFiles = (): PluginOption => {
	launchScript()
	return {
		name: 'watch-assets',
		apply: 'serve',
		configureServer(server) {
			server.watcher.on('add', launchScript)
			server.watcher.on('unlink', launchScript)
		},

	}
}