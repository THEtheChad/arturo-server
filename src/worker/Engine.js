import Actor from '../utilities/Actor'

export default class Worker extends Actor {
  constructor({ worker }) {
    super()

    this.worker = worker
  }

  async _perform(computation) {
    const job = computation.payload

    let worker
    try {
      worker = Promise.resolve(this.worker(job))
    }
    catch (err) {
      computation.failed(err)
      computation.next()
      return
    }

    const operations = [worker]

    if (job.ttl) {
      const timeout = new Promise((resolve, reject) => {
        let timer = setTimeout(() => reject(new Error(`Time-to-live exceeded: ${job.ttl}ms`)), job.ttl)
        worker.then(() => {
          clearTimeout(timer)
          resolve()
        })
      })
      operations.push(timeout)
    }

    try {
      await Promise.all(operations)
      computation.push(job)
    }
    catch (err) {
      computation.failed(err)
    }
    computation.next()
  }
}