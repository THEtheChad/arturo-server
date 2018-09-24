import os from 'os'
import stream from 'stream'
import { fork } from 'child_process'

export default class Fork extends stream.Writable {
  constructor() {
    const highWaterMark = Math.max(os.cpus().length - 1, 1)

    super({
      highWaterMark,
      objectMode: true
    })

    this.max = highWaterMark
    this.active = []
  }

  async _write({
    path,
    args,
    opts,
    onSpawn,
    onExit,
    onDisconnect,
    onError
  }, enc, next) {
    // don't spin up queued workers
    // if we're destroying this stream
    if (this.destroyed) return

    // if we've reached max concurrency
    // wait til there's space to
    // spin up this worker
    if (this.active.length >= this.max) {
      const defer = () => this._write(args, enc, next)
      this.once('child:exit', defer)

      // deque this deferred worker
      // if we're destroying the stream
      this.once('destroy', () => this.removeListener('child:exit', defer))
      return
    }

    const child = fork(path, args || [], opts || {})
    this.active.push(child)

    // kill this worker if
    // we're destroying the stream
    const kill = () => child.kill()
    this.once('destroy', kill)

    child
      .on('error', err => {
        if (onError) onError.call(child, err, child)
        this.emit('child:error', err, child)
      })
      .on('disconnect', () => {
        if (onDisconnect) onDisconnect.call(child, child)
        this.emit('child:disconnect', child)
      })
      .once('exit', (code, sig) => {
        this.removeListener('destroy', kill)
        const idx = this.active.indexOf(child)
        this.active.splice(idx, 1)

        if (onExit) onExit.call(child, code, sig, child)
        this.emit('child:exit', child, code, sig)
      })

    onSpawn.call(child, child)
    this.emit('child:spawn', child)
    next()
  }

  isEmpty() {
    return this.active.length <= 0
  }

  _stats() {
    return {
      queue: this.writableLength,
      active: this.active.length,
      max: this.max,
      pids: this.active.map(child => child.pid),
    }
  }

  _destroy(err, done) {
    this.end()

    const checkEmpty = () => (this.isEmpty() && done(err))

    checkEmpty()
    this.on('child:exit', checkEmpty)
    this.emit('destroy')
  }
}