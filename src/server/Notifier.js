import Debug from 'debug'
import Actor from '../utilities/Actor'
import Shutdown from '../server/Shutdown'
import Email from '../email'

export default class JobUpdater extends Actor {
  constructor(sequelize, opts = {}) {
    super(opts)

    this.resume()
    this.sequelize = sequelize
    this.email = new Email()
    // Shutdown.addHandler((code, sig) => new Promise(resolve => {
    //   this.once('finish', () => {
    //     console.log(`${this.uuid} shutdown complete...`)
    //     resolve()
    //   })
    // }), (remover) => this.once('finish', remover))
  }

  async _compute(job) {
    try {
      const watchers = await this.sequelize.models.Watcher.findAll({
        where: {
          route: job.route,
          digest: false,
        }
      })
      this.email.send(job, watchers.map(watcher => watcher.toJSON()))
    }
    catch (err) {
      console.error(`${this.uuid}: DATABASE ERROR`)
      console.error(err)
    }
  }
}
