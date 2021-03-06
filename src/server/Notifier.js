import Debug from 'debug'
import Actor from '../utilities/Actor'
import Shutdown from '../server/Shutdown'
import Email from '../email'

export default class Notifier extends Actor {
  constructor(sequelize, opts = {}) {
    super(opts)

    this.resume()
    this.sequelize = sequelize
    this.email = new Email({
      sendmail: true,
      newline: 'unix',
      path: '/usr/sbin/sendmail'
    })
    // Shutdown.addHandler((code, sig) => new Promise(resolve => {
    //   this.once('finish', () => {
    //     console.log(`${this.uuid} shutdown complete...`)
    //     resolve()
    //   })
    // }), (remover) => this.once('finish', remover))
  }

  async _perform(computation) {
    const job = computation.payload
    try {
      const watchers = await this.sequelize.models.Watcher.findAll({
        where: {
          route: job.route,
          digest: false,
        }
      })
      this.email.send(job, watchers.map(watcher => watcher.toJSON()))
      computation.next()
    }
    catch (err) {
      computation.failed(err)
    }
  }
}
