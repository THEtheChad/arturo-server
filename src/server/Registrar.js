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
    this.opts = Object.assign({ port: 61681 }, opts)

    this.uuid = `${this.constructor.name}-${process.pid}-${uuid()}`
    this.debug = Debug(`arturo:${this.uuid}`)

    this.queue = {
      add: new Queue,
      remove: new Queue
    }

    this.environment = path.join(process.cwd(), '__environments__', `${this.opts.port}`)
    fs.ensureDirSync(this.environment)

    this.listener = nssocket.createServer(socket => {
      const method = (event, queue) => {
        const parts = event.split('.')
        socket.data(parts, ({ worker, environment }) => {
          // @TODO: handle multiple workers on same server
          fs.writeJsonSync(path.join(this.environment, `${sanitize(worker.route)}.json`), environment)
          this.debug(`${event} ${worker.route}`)
          queue.write(worker)
          socket.send([...parts, 'success'], worker)
        })
      }

      method('worker.create', this.queue.add)
      method('worker.destroy', this.queue.remove)

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