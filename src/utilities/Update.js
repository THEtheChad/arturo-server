import stream from 'stream'

export default class Update extends stream.Writable {
  constructor(update) {
    super({ objectMode: true })

    this.update = update
  }

  _write({ operation, transaction }, end, next) {
    operation.then(async instance => {
      if (instance) {
        const nextOperation = this.update(instance, transaction)

        nextOperation
          .then(() => next())
          .catch(err => next(err))
      } else {
        next()
      }
    })
  }
}