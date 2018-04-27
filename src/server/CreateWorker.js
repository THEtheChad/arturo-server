import Debug from 'debug'
import Actor from '../utilities/Actor'
import Shutdown from '../server/Shutdown'

export default class CreateWorker extends Actor {
  constructor(opts = {}) {
    super(opts)

    this.sequelize = opts.sequelize

    Shutdown.addHandler((code, sig, done) => this.once('finish', () => {
      console.log(`${this.uuid} shutdown complete...`)
      done()
    }))
  }

  async _perform(computation) {
    const worker = computation.payload
    worker.serverId = global.server ? global.server.id : -1

    try {
      const instance = await this.sequelize.models.Worker.create(worker)
      this.debug(`WORKER added #${instance.id}`)
    } catch (err) {
      computation.failed(err)
    }
    computation.next()
  }
}