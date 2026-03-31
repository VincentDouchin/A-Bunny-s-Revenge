export class Pool<T> extends Array<T> {
	constructor(
		private fn: () => Promise<T>,
		private amount: number,
	) {
		super()
	}

	async init() {
		for (let i = 0; i < this.amount; i++) {
			this.push(await this.fn())
		}
		return this
	}

	async getAsync() {
		let item = this.pop()
		if (!item) {
			item = await this.fn()
		}
		const free = () => this.push(item)
		return { free, item }
	}

	get() {
		const item = this.pop()
		if (item) {
			const free = () => this.push(item)
			return { free, item }
		}
	}
}
