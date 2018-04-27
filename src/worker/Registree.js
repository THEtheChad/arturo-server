import net from 'net'
import { after } from 'lodash'
import nssocket from 'nssocket'

export default class WorkerRegistration {
  constructor() {
    this.config = { port: 61681 }
  }

  toArray(input) {
    return Array.isArray(input) ? input : [input]
  }

  client(opts = {}) {
    const client = new nssocket.NsSocket()
    const resolution = new Promise((resolve, reject) => {
      client.on('error', reject)
      client.on('close', had_error => had_error ? reject() : resolve())
      client.on('timeout', () => client.close())
      if (opts.after) {
        client.data(['recieved'], after(opts.after, () =>
          client.end()))
      }
    })
    return { client, resolution }
  }

  add(_workers) {
    const workers = this.toArray(_workers)
    const { client, resolution } = this.client({ after: workers.length })

    client.data(['connected'], () => {
      workers.forEach((worker) =>
        client.send(['worker', 'add'], worker))
    })

    client.connect(this.config.port)
    return resolution
  }

  remove(_workers) {
    const workers = this.toArray(_workers)
    const { client, resolution } = this.client({ after: workers.length })

    client.data(['connected'], () => {
      workers.forEach((worker) =>
        client.send(['worker', 'remove'], worker))
    })

    client.connect(this.config.port)
    return resolution
  }
}