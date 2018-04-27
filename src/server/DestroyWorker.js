import Debug from 'debug'
import Actor from '../utilities/Actor'
import Shutdown from '../server/Shutdown'

export default class DestroyWorker extends Actor {
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

    try {
      const instance = await this.sequelize.models.Worker.destroy({ where: { id: worker.id } })
      this.debug(`WORKER destroyed #${instance.id}`)
    } catch (err) {
      console.error(`${this.uuid}: DATABASE ERROR`)
      console.error(err)
    }
    computation.next()
  }
}