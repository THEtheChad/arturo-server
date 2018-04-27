import Debug from 'debug'
import Actor from '../utilities/Actor'
import Shutdown from '../server/Shutdown'

export default class JobUpdater extends Actor {
  constructor(opts = {}) {
    super(Object.assign({}, opts))

    this.sequelize = opts.sequelize
    this.log = function (...args) {
      args[0] = `arturo:${this.uuid} ${args[0]}`
      console.log.apply(console, args)
    }

    // @TODO:
    // for single updater
    // shutdown based on how many streams are piped
    // and what's left in the queue
    // STEPS
    //   - trigger end when all streams unpiped
    //   - done when queue is empty

    Shutdown.addHandler((code, sig, done) => {
      // JobUpdater
      this.once('finish', () => {
        console.log(`${this.uuid} shutdown complete...`)
        done()
      })
    }, (remove) => this.once('finish', remove))
  }

  async _perform(computation) {
    const job = computation.payload
    job.lastServer = global.server ? global.server.id : -1
    job.lock = null

    switch (job.status) {
      case 'completed': {
        job.finishDate = new Date
        break
      }

      case 'failed': {
        if (!job.maxAttempts || job.attempts < job.maxAttempts) {
          job.status = 'backoff'
        }
        break
      }

      case 'cancelled': {
        job.status = (job.attempts <= 0) ? 'scheduled' : 'retry'
        break
      }

      default: {
        throw new Error(`unexpected job status ${job.status}`)
      }
    }

    try {
      await this.sequelize.models.Job.update(job, { where: { id: job.id } })
      this.log(`job #${job.id} ${job.status}`)
      computation.push(job)
      computation.next()
    } catch (err) {
      console.error(`${this.uuid}: DATABASE ERROR`)
      console.error(err)
    }
  }
}