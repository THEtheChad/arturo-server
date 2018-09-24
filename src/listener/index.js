import path from 'path'
import fs from 'fs-extra'
import sanitize from 'sanitize-filename'
import nssocket from 'nssocket'
import Debug from 'debug'
import Queue from '../utilities/Queue'
import Worker from '../objects/Worker'
import Shutdown from '../server/Shutdown'
import uuid from '../utilities/uuid'

export default class Registrar {
  constructor(opts) {
    this.opts = Object.assign({
      port: 61681,
    }, opts)

    if (!this.opts.environmentDir) {
      this.opts.environmentDir = path.join(process.cwd(), '__environments__', `${this.opts.port}`)
    }

    this.uuid = `${this.constructor.name}-${process.pid}-${uuid()}`
    this.debug = Debug(`arturo:${this.uuid}`)

    this.queue = {
      add: new Queue,
      remove: new Queue
    }

    fs.ensureDirSync(this.opts.environmentDir)

    this.listener = nssocket.createServer(socket => {

      const createWorker = ['worker', 'create']
      socket.data(createWorker, ({ messageId, payload }) => {
        const { worker, environment } = payload
        const filename = path.join(this.opts.environmentDir, `${sanitize(worker.route)}.json`)
        fs.writeJsonSync(filename, environment)
        this.queue.add.write(worker)
        socket.send(createWorker, { worker })
      })

      const destroyWorker = ['worker', 'destroy']
      socket.data(destroyWorker, ({ messageId, payload }) => {
        const { worker } = payload
        const filename = path.join(this.opts.environmentDir, `${sanitize(worker.route)}.json`)
        fs.unlinkSync(filename)
        this.queue.remove.write(worker)
        socket.send(destroyWorker, { worker })
      })

      socket.send(['connected'])
    })
      .on('listening', () =>
        this.debug(`listening on ${this.listener.address().address}:${this.listener.address().port}`))
      .on('error', err => {
        const restartDelay = 5000
        console.error(`WARNING: Registrar encountered an error`)
        console.error(`         restarting in ${restartDelay}ms`)
        console.error(err)
        setTimeout(() => Registrar(server, this.opts.port), restartDelay)
      })
      .listen(this.opts.port)

    Shutdown.addHandler((code, sig) => {
      this.queue.add.end()
      this.queue.remove.end()
    })
  }

  close(done) { this.listener.close(done) }
}