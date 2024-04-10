export class Pool<T> {
	map = new Map<T, Set<T>>()
	constructor(private duplicate: (item: T) => T, private amount: number) {

	}

	getItem(set: Set<T>) {
		const [first] = set
		set.delete(first)
		return [first, () => set.add(first)] as const
	}

	get(item: T) {
		const pool = this.map.get(item)
		if (!pool) {
			const newPool = new Set<T>()
			for (let i = 0; i < this.amount; i++) {
				newPool.add(this.duplicate(item))
			}
			this.map.set(item, newPool)
			return this.getItem(newPool)
		} else if (pool.size === 0) {
			pool.add(this.duplicate(item))
		}
		return this.getItem(pool)
	}
}