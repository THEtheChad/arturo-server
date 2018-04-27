const path = require('path')
const server = require('./test-server')
const client = require('./test-client')

async function main() {
  await server.initialized

  await client.add({ route: '/test1', path: path.join(__dirname, 'test-worker.js') })
  await server.sequelize.models.Watcher.create({ route: '/test1', email: 'chad.d.elliott@gmail.com', digest: false })

  await server.sequelize.models.Job.create({ route: '/test1', params: { error: true } })
  await server.sequelize.models.Job.create({ route: '/test1', params: { error: true } })
  await server.sequelize.models.Job.create({ route: '/test1', params: { fail: true } })
  await server.sequelize.models.Job.create({ route: '/test1', params: { fail: true } })
  await server.sequelize.models.Job.create({ route: '/test1' })
  await server.sequelize.models.Job.create({ route: '/test1' })
  await server.sequelize.models.Job.create({ route: '/test1' })
  await server.sequelize.models.Job.create({ route: '/test1' })
}
main()
  .catch(err => { throw err })