import nssocket from 'nssocket'
import Debug from 'debug'
import Queue from '../utilities/Queue'
import Worker from '../objects/Worker'
import Shutdown from '../server/Shutdown'
import uuid from '../utilities/uuid'

export default class Registrar {
  constructor(port = 61681) {
    this.uuid = `${this.constructor.name}-${process.pid}-${uuid()}`
    this.debug = Debug(`arturo:${this.uuid}`)

    this.queue = {
      add: new Queue,
      remove: new Queue
    }

    this.listener = nssocket.createServer(socket => {
      const method = (event, queue) => {
        socket.data(event.split('.'), (worker) => {
          this.debug(`${event} ${worker.route}`)
          queue.write(worker)
          socket.send(['recieved'])
        })
      }

      method('worker.add', this.queue.add)
      method('worker.remove', this.queue.remove)

      socket.send(['connected'])
    })
      .on('listening', () =>
        this.debug(`listening on ${this.listener.address().address}:${this.listener.address().port}`))
      .on('error', err => {
        const restartDelay = 5000
        console.error(`WARNING: Registrar encountered an error`)
        console.error(`         restarting in ${restartDelay}ms`)
        console.error(err)
        setTimeout(() => Registrar(server, port), restartDelay)
      })
      .listen(port)

    Shutdown.addHandler((code, sig) => {
      this.queue.add.end()
      this.queue.remove.end()
    })
  }

  close(done) { this.listener.close(done) }
}