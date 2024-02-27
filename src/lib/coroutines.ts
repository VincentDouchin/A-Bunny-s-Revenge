export class CoroutinesManager {
	coroutines = new Set<Generator>()
	add(fn: () => Generator) {
		const coroutine = fn()
		this.coroutines.add(coroutine)
		return () => this.coroutines.delete(coroutine)
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