const Arturo = require('./lib')

Arturo.Worker(job => {
  if (job.params.error) {
    throw new Error('test')
  }
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      job.params.fail ? reject(new Error('shit')) : resolve('weeeeee!!!')
    }, 500)
  })
})