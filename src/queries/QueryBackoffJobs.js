import Debug from 'debug'
import stream from 'stream'
import uuid from '../utilities/uuid'
import Shutdown from '../server/Shutdown'

export default class QueryBackoffJobs extends stream.Readable {
  constructor(sequelize) {
    super({ objectMode: true })

    this.uuid = `${this.constructor.name}-${process.pid}-${uuid()}`
    this.debug = Debug(`arturo:${this.uuid}`)

    this.sequelize = sequelize
    this.where = {
      status: 'backoff',
      lock: null,
    }

    Shutdown.addHandler(
      (code, sig, done) => this.destroy(null, done),
      (remove) => this.once('end', remove)
    )
  }

  async fetch() {
    if (this.readableLength > 0) return

    const count = await this.sequelize.models.Job.count({ where: this.where })
    this.debug(`found ${count} job(s) that needed to be scheduled...`)

    this._read()
  }

  async _read() {
    if (this.destroyed) return

    const { sequelize } = this
    const { Job } = sequelize.models

    try {
      let instance = null
      await sequelize.transaction(async transaction => {
        instance = await Job.findOne({
          where: this.where,
          lock: transaction.LOCK.UPDATE,
          transaction
        })

        if (instance) {
          await instance.update({
            lastServer: global.server ? global.server.id : -1,
            lock: global.server ? global.server.id : -1,
          }, { transaction })
        }
      })

      if (instance && !this.destroyed) {
        this.push(instance.toJSON())
      }
    } catch (err) {
      console.error(`DATABASE ERROR: ${this.uuid}`)
      console.error(err)
    }
  }

  _destroy(err, done) {
    this.push(null)
    this.debug('DESTROYED')
    done(err)
  }
}