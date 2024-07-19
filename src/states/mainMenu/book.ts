import { easeInOut } from 'popmotion'
import type { ShaderMaterial } from 'three'
import { CanvasTexture, Mesh, MeshBasicMaterial, Object3D } from 'three'
import { assets, save, tweens } from '@/global/init'
import { playSound } from '@/global/sounds'
import { campState, ruinsIntro } from '@/global/states'
import { drawnHouseShader } from '@/shaders/drawnHouseShader'
import { cloneCanvas, imgToCanvas } from '@/utils/buffer'

type MenuOption = 'Continue' | 'New Game' | 'Settings' | 'Credits'

const selectOption = (fn: (offset: number) => void) => new Promise<void>((resolve) => {
	playSound('020_Confirm_10')
	tweens.add({
		from: 0,
		to: 20,
		duration: 200,
		onUpdate: fn,
		repeatType: 'reverse',
		repeat: 2,
	})

	setTimeout(resolve, 300)
})

export class MainMenuBook extends Object3D {
	withTimeUniforms = new Array<ShaderMaterial>()
	buttons = new Map<MenuOption, Mesh>()
	disabled = new Array<MenuOption>()
	selected: MenuOption
	optionsDimensions = new Map<MenuOption, { y: number, w: number }>()
	pageRightCanvas = imgToCanvas(assets.textures.parchment.source.data)
	pageRightTexture = new CanvasTexture(this.pageRightCanvas.canvas)
	menu = ['Continue', 'New Game'] as const
	marginLeft = 250
	textColor = '#2c1e31'
	disabledTextColor = '#a597aa'
	font = 'EnchantedLand'
	transition = false
	windowShader = drawnHouseShader()
	confirmed = false
	constructor() {
		super()
		const book = assets.mainMenuAssets.book.scene.clone()
		this.add(book)
		this.scale.setScalar(10)
		this.rotateX(-Math.PI / 2)
		this.rotateY(Math.PI / 2)

		this.selected = save.started ? 'Continue' : 'New Game'
		if (!save.started) {
			this.disabled.push('Continue')
		}

		this.pageRightCanvas.fillStyle = this.textColor
		this.pageRightCanvas.globalAlpha = 0.8
		this.pageRightCanvas.font = `bold 130px ${this.font}`
		this.pageRightCanvas.fillText('Fabled Recipes', 200, 200)
		this.pageRightCanvas.font = `normal 110px ${this.font}`
		let marginTop = 400

		for (let i = 0; i < this.menu.length; i++) {
			const text = this.menu[i]
			this.pageRightCanvas.fillStyle = this.disabled.includes(text) ? this.disabledTextColor : this.textColor
			this.pageRightCanvas.fillText(text, this.marginLeft, marginTop)
			const { width } = this.pageRightCanvas.measureText(text)
			this.optionsDimensions.set(text, { y: marginTop, w: width })
			marginTop += 120
		}

		book.traverse((node) => {
			if (node instanceof Mesh && node.name === 'pageleft') {
				node.material = this.windowShader
				this.withTimeUniforms.push(this.windowShader)
			}
			if (node instanceof Mesh && node.name === 'pageRight') {
				node.material = new MeshBasicMaterial({ map: this.pageRightTexture })
			}

			for (const text of ['Continue', 'New Game', 'Settings', 'Credits'] as const) {
				if (node.name === text.replace(' ', '_') && node instanceof Mesh) {
					node.material = new MeshBasicMaterial({ transparent: true, opacity: 0 })
					if (this.menu.includes(text)) {
						this.buttons.set(text, node)
					}
				}
			}
		})
		this.drawPage()
	}

	confirm() {
		if (this.transition) return
		this.confirmed = true
		return selectOption(f => this.drawPage(f))
	}

	navigate(dir: -1 | 1) {
		const newSelected = this.menu.at((this.menu.indexOf(this.selected) + dir) % this.menu.length)
		if (newSelected) {
			this.select(newSelected)
		}
	}

	async select(newSelected: MenuOption) {
		if (this.transition || this.confirmed) return
		if (this.selected !== newSelected && !this.disabled.includes(newSelected)) {
			this.selected = newSelected
			this.drawPage()
			this.transition = true
			await tweens.async({
				from: 0,
				to: -1,
				ease: [easeInOut],
				duration: 1000,
				onUpdate: f => this.windowShader.uniforms.windowSize.value = f,
			}, {
				from: -1,
				to: 0,
				ease: [easeInOut],
				duration: 1000,
				onPlay() {
					if (newSelected === 'Continue') {
						ruinsIntro.disable()
						campState.enable({})
					}
					if (newSelected === 'New Game') {
						campState.disable()
						ruinsIntro.enable()
					}
				},
				onUpdate: f => this.windowShader.uniforms.windowSize.value = f,
			})
			this.transition = false
		}
	}

	drawPage(offset = 0) {
		const clone = cloneCanvas(this.pageRightCanvas.canvas)
		const dimensions = this.optionsDimensions.get(this.selected)
		if (!dimensions) return

		const { y, w } = dimensions
		this.drawUnderline(clone, this.marginLeft, y, w, offset)
		clone.shadowColor = 'white'
		clone.shadowBlur = offset
		clone.fillStyle = this.textColor
		clone.font = `normal 110px ${this.font}`
		clone.fillText(this.selected, this.marginLeft, y)
		this.pageRightTexture.image = clone.canvas
		this.pageRightTexture.needsUpdate = true
	}

	drawUnderline(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, offset: number) {
		ctx.globalAlpha = 1
		const underline: HTMLImageElement = assets.textures.borders.source.data
		// left
		ctx.drawImage(
			underline,
			0, // x
			0, // y
			150, // w
			underline.height, // h
			x - 100 - offset, // x
			y - underline.height / 2 - 30, // y
			150, // w
			underline.height, // h
		)
		// right
		ctx.drawImage(
			underline,
			underline.width - 150, // x
			0, // y
			150, // w
			underline.height, // h
			x + w - 50 + offset, // x
			y - underline.height / 2 - 30, // y
			150, // w
			underline.height, // h
		)
		ctx.globalAlpha = 0.8
	}
}