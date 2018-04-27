const stream = require('stream')
const Actor = require('./lib/utilities/Actor').default

class Read extends stream.Readable {
  constructor() {
    super({ objectMode: true })
    this.count = 0
  }

  _read() {
    setTimeout(() => {
      this.count < 10 ? this.push(++this.count) : this.push(null)
    }, 0)
  }
}


class Write extends stream.Writable {
  constructor() {
    super({
      highWaterMark: 0,
      objectMode: true
    })

    this.on('finish', () => console.log('FINISHED WRITING'))
  }

  _write(action, enc, next) {
    console.log('_write', action.payload)
    setTimeout(next, 0)
  }
}

class Test extends Actor {
  constructor() {
    super({
      highWaterMark: 4,
    })
  }

  _perform(computation) {
    console.log('computing', computation.action.payload)
    computation.push(null, computation.action.payload)
    setTimeout(() => computation.next(), 10000)
  }
}

new Read().pipe(new Test({ highWaterMark: 2, concurrency: 2 })).pipe(new Write({ highWaterMark: 0 }))