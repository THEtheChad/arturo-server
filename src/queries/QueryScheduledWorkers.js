import Debug from 'debug'
import stream from 'stream'
import uuid from '../utilities/uuid'
import Shutdown from '../server/Shutdown'

export default class QueryScheduledWorkers extends stream.Readable {
  constructor(sequelize, trigger) {
    super({ objectMode: true })

    this.sequelize = sequelize
    this.uuid = `${this.constructor.name}-${process.pid}-${uuid()}`
    this.debug = Debug(`arturo:${this.uuid}`)

    Shutdown.addHandler(
      (code, sig, done) => this.destroy(null, done),
      (remove) => this.once('end', remove)
    )
  }

  fetch() {
    if (this.destroyed) return
    if (this.readableLength > 0) return

    const { Op, dialect } = this.sequelize
    const generator = dialect.QueryGenerator

    // @TODO: limit to one job route
    this.sequelize.query(`
      SELECT *
      FROM Workers
      WHERE
        Workers.active = 1 AND
        Workers.serverId = ${global.server.id} AND
        Workers.route IN (
          SELECT Jobs.route
          FROM Jobs
          WHERE
              Jobs.status IN ('scheduled', 'retry') AND
              ${generator.whereItemQuery(this.sequelize.literal('Jobs.scheduledDate'), { [Op.lte]: new Date })}
            GROUP BY Jobs.route
        )
    `)
      .spread((workers, metadata) => {
        this.debug(`found ${workers.length} worker(s) with scheduled jobs...`)
        workers.forEach(worker => {
          if (!this.destroyed) this.push(worker)
        })
      })
  }

  _read() { }

  _destroy(err, done) {
    this.push(null)
    this.debug('DESTROYED')
    done(err)
  }
}