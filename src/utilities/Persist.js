import stream from 'stream'

export default class Persist extends stream.Writable {
  constructor(model, operation, opts = {}) {
    super({ objectMode: true })

    this.model = model
    this.operation = operation
    this.concurrency = opts.concurrency || 1
    this.active = []
  }

  _write(object, enc, next) {
    const operation = this.operation(object)

    operation
      .then(instance => {
        this.emit('record:success', instance)
      })
      .catch(err => {
        console.error(err.sql)
        this.emit('record:error', model)
      })

    this.active.push(operation)
    operation.then(() => {
      const idx = this.active.indexOf(operation)
      this.active.splice(idx, 1)
    })

    if (this.active.length < this.concurrency) {
      next()
    } else {
      operation.then(() => next())
    }
  }
}