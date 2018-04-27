const stream = require('stream')

class read extends stream.Readable {
  constructor() {
    super({ objectMode: true })
    this.i = 0
  }

  _read() {
    while (this.i < 100) {
      this.push({ i: this.i++ })
    }
    this.push(null)
  }
}

class write extends stream.Writable {
  constructor() {
    super({ objectMode: true })
    this.concurrency = 1
    this.computation = async (chunk) => new Promise((resolve) => setTimeout(resolve, 20))
  }

  _write(chunk, enc, next) {
    const operation = this.computation(chunk)
    console.log(this.writableLength)
    operation
      .then(() => next())
      .catch(err => next(err))
  }
}

const reading = new read
const writing = new write
reading.pipe(writing, { end: false })

setTimeout(() => console.log('timeout', writing.writableLength), 4000)
// r.on('data', () => { w.writableLength })