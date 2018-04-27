import Debug from 'debug'
import stream from 'stream'
const debug = Debug('arturo:query')

export default class FindOne extends stream.Readable {
  constructor(model, where = {}, trigger, opts = { end: false }) {
    super({ objectMode: true })

    this.opts = opts
    this.model = model
    this.sequelize = this.model.sequelize
    this.where = (typeof where === 'function') ? where : () => where

    if (typeof trigger !== 'function') {
      setInterval(() => this.refresh(), trigger || 0)
    } else {
      trigger(this.refresh.bind(this))
    }
  }

  async refresh(where = {}) {
    if (this.readableLength > 0) return

    this.currentWhere = this.where()
    this.count = await this.model.count({ where: this.currentWhere })

    debug(`${this.count} ${this.model.name}(s) ${JSON.stringify(this.currentWhere)}`)

    if (this.count) this._read()
  }

  async _read() {
    if (this.active) return
    this.active = true

    let full = false
    while (this.count--) {
      try {
        await this.sequelize.transaction({
          isolationLevel: this.sequelize.Transaction.ISOLATION_LEVELS.READ_COMMITTED
        }, async transaction => {
          const operation = this.model.findOne({
            where: this.currentWhere,
            lock: transaction.LOCK.UPDATE,
            transaction
          })

          full = !this.push({ operation, transaction })

          return operation
        })
      } catch (err) {
        console.error('DATABASE ERROR')
        console.error(err)
      }

      if (full) break
    }

    this.active = false
  }
}