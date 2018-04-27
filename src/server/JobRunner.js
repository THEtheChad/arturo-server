import Shutdown from './Shutdown'
import Actor from '../utilities/Actor'

export default class JobRunner extends Actor {
  constructor(opts) {
    super(Object.assign({}, opts))

    this.log = function (...args) {
      args[0] = `arturo:${this.uuid} ${args[0]}`
      console.log.apply(console, args)
    }

    this.subprocess = opts.subprocess
    this.sequelize = opts.sequelize

    Shutdown.addHandler((code, sig, done) => {
      this.cancelled = true
      this.once('finish', done)
    }, (remove) => this.once('finish', remove))

    this.on('error', err => {
      console.error(this.uuid)
      console.error(err)
    })
  }

  async _perform(computaton) {
    const job = computaton.payload
    const { subprocess } = this

    if (this.cancelled) {
      this.log(`${subprocess.pid} cancelling job #${job.id}...`)
      job.status = 'cancelled'
      computaton.push(job)
      computaton.next()
      return
    }

    if (!subprocess.connected) {
      this.log(`${subprocess.pid} worker unreachable: rescheduling job #${job.id}...`)
      const err = new Error('Worker Unreachable')

      job.status = 'failed'
      job.errorMsg = err.message
      job.errorId = this.logError(err)
      job.attempts = job.attempts + 1
      computaton.push(job)
      computaton.next()
      return
    }

    this.log(`${subprocess.pid} processing job #${job.id}...`)

    job.status = 'processing'
    job.attempts = job.attempts + 1
    job.startDate = new Date
    await this.sequelize.models.Job.update(job, { where: { id: job.id } })

    const handleDisconnect = () => {
      clearListeners()
      this.log(`${subprocess.pid} worker interrupted: unable to finish job #${job.id}...`)
      const err = this.cancelled ? new Error('Worker Interrupted') : new Error('Worker Failure')

      job.status = 'failed'
      job.errorMsg = err.message
      job.errorId = this.logError(err)
      computaton.push(job)
      computaton.next()
    }

    const handleMessage = (result) => {
      if (result.id !== job.id) return
      clearListeners()
      computaton.push(result)
      computaton.next()
    }

    const clearListeners = () => {
      subprocess.removeListener('disconnect', handleDisconnect)
      subprocess.removeListener('exit', handleDisconnect)
      subprocess.removeListener('message', handleMessage)
    }

    if (this.cancelled || !subprocess.connected) {
      return await this._perform(computaton)
    }

    subprocess.on('message', handleMessage)
    subprocess.once('disconnect', handleDisconnect)
    subprocess.once('exit', handleDisconnect)
    subprocess.send({ type: 'job', job })
  }

  _final(done) {
    if (this.subprocess.connected) {
      this.subprocess.send({ type: 'end' })
    }

    done()
  }
}