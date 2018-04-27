import stream from 'stream'

export default class Reader extends stream.Readable {
  constructor(Model, query = {}, opts) {
    super({ objectMode: true })

    this.query = query
    this.opts = Object.assign({
      limit: 10,
      offset: 0
    }, opts)

    this.model = Model

    this.current = 0
    this.total = null
    this.rows = []
  }

  async initial() {
    this.pending = true
    let { count, rows } = await this.model.findAndCountAll(
      Object.assign({}, this.query, this.opts)
    )
    this.emit('count', count)
    this.total = count
    this.rows = this.rows.concat(rows)
    this.pending = false
    this._read()
  }

  async nextPage() {
    this.pending = true
    this.opts.offset += this.opts.limit
    let rows = await this.model.findAll(Object.assign({}, this.query, this.opts))
    this.rows = this.rows.concat(rows)
    this.pending = false
    this._read()
  }

  async _read() {
    if (this.pending) return

    if (this.total === null) {
      return this.initial()
    }

    let row
    while (row = this.rows.shift()) {
      this.current++
      let full = !this.push(row.toJSON())
      if (full) return
    }

    (this.current < this.total) ?
      this.nextPage() : this.push(null)
  }
}