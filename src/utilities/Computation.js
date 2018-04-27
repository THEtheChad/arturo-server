import Action from './Action'

export default class Computation {
  constructor(actor, chunk, encoding, next) {
    this.actor = actor
    this.actorState = actor._actorState
    this.readableState = actor._readableState
    this.writableState = actor._writableState

    this._complete = false
    this.complete = () => {
      if (this._complete) return
      this._complete = true
      next()
    }

    this.action = new Action(null, chunk, { encoding })
  }

  get payload() {
    return this.action.payload
  }

  get error() {
    return this.action.error
  }

  get meta() {
    return this.action.meta
  }

  failed(err, payload, meta) {
    this.actor.logError(err)
    this.actor.push(err, this.action.payload, this.action.meta)
  }

  push(value = null, meta = {}) {
    this.actor.push(null, value, meta)
  }

  next() {
    const remaining = --this.actorState.activeComputations
    if (this.writableState.ending && !this.writableState.length && !remaining) {
      this.actor._push(null)
    } else {
      this.complete()
    }
  }

  handleConcurrency() {
    if (this.actorState.activeComputations < this.readableState.highWaterMark) {
      this.complete()
    }
  }
}