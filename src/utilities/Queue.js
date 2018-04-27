import stream from 'stream'
import Action from './Action'

export default class Queue extends stream.Transform {
  constructor(opts) {
    super({ objectMode: true })
  }

  _transform(payload, encoding, next) {
    this.push(new Action(null, payload, { encoding }))
    next()
  }
}