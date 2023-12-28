export class CoroutinesManager {
	coroutines = new Set<Generator>()
	add(fn: () => Generator) {
		this.coroutines.add(fn())
	}

	tick = () => {
		for (const coroutine of this.coroutines) {
			const res = coroutine.next()
			if (res.done) {
				this.coroutines.delete(coroutine)
			}
		}
	}
}