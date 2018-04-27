import os from 'os'
import Debug from 'debug'
import stream from 'stream'
import uuid from './uuid'
import Computation from './Computation'
import Action from './Action'

const noop = () => { }

export default class Actor extends stream.Duplex {
  constructor(opts = {}) {
    super(Object.assign({ objectMode: true }, opts))

    this.uuid = `${this.constructor.name}-${process.pid}-${uuid()}`
    this.debug = Debug(`arturo:${this.uuid}`)

    this._actorState = {
      needData: 0,
      activeComputations: 0,
    }

    this._push = super.push
    this.on('finish', () => super.push(null))
  }

  logError(err) {
    err.id = `${this.uuid}:ERR${uuid()}`
    console.error(err.id)
    console.error(err)
  }

  async _write(chunk, encoding, next) {
    const as = this._actorState
    const rs = this._readableState

    if (as.needData || rs.length < rs.highWaterMark) {
      if (as.needData)
        --as.needData

      const computation = new Computation(this, chunk, encoding, next)
      this.perform(computation)
      computation.handleConcurrency()
    } else {
      as.deferred = [chunk, encoding, next]
    }
  }

  perform(computation) {
    this._actorState.activeComputations++

    try {
      this._perform(computation)
    } catch (err) {
      this.logError(err)
      computation.failed(err)
      computation.next()
    }
  }

  push(err = null, payload = null, meta = {}) {
    if (!this._readableState.flowing) return
    return super.push(new Action(err, payload, meta))
  }

  _read() {
    const as = this._actorState
    as.needData++

    const deferred = as.deferred
    if (deferred) {
      as.deferred = null
      this._write.apply(this, deferred)
    }
  }

  _perform(action) {
    throw new Error('Must provide a _compute method to Actor')
  }

  get empty() {
    return this.writableLength === 0
  }
}