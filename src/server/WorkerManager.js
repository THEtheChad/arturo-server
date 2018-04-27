import Debug from 'debug'
import Promise from 'bluebird'
import Actor from '../utilities/Actor'
import JobRunner from './JobRunner'
import JobUpdater from './JobUpdater'
import Queue from '../utilities/Queue'
import QueryWorkerJobs from '../queries/QueryWorkerJobs'
import Shutdown from '../server/Shutdown'
import Fork from '../utilities/Fork'

export default class WorkerManager extends Actor {
  static QUEUE = new Fork

  constructor(opts) {
    super(Object.assign({
      highWaterMark: WorkerManager.QUEUE.highWaterMark
    }, opts))

    this.sequelize = opts.sequelize
    this.notifier = opts.notifier

    Shutdown.addHandler((code, sig, done) => this.destroy(null, done))
  }

  _perform(computation) {
    if (this.destroyed) return

    const worker = computation.payload
    const { sequelize } = this
    const { path } = worker

    WorkerManager.QUEUE.write({
      path,
      opts: { stdio: ['ignore', 'ignore', 'ignore', 'ipc'] },
      onSpawn: (subprocess) => {
        this.debug(`WORKER ${subprocess.pid} ${worker.route}: initializing`)

        new QueryWorkerJobs({
          sequelize,
          worker,
          highWaterMark: 0
        })
          .pipe(new JobRunner({
            sequelize,
            subprocess,
            highWaterMark: 0,
          }))
          .pipe(new JobUpdater({ sequelize }))
          .pipe(this.notifier, { end: false })
      },
      onDisconnect: (subprocess) => this.debug(`WORKER ${subprocess.pid} ${worker.route}: disconnected`),
      onError: (err, subprocess) => this.debug(`WORKER ${subprocess.pid} ${worker.route}: error ${err.message}`),
      onExit: (code, sig, subprocess) => {
        this.debug(`WORKER ${subprocess.pid} ${worker.route}: exit ${code} ${sig}`)
        computation.next()
      },
    })
  }

  _destroy(err1, done) {
    this.notifier.destroy(err1, (err2) => {

    })
    WorkerManager.QUEUE.destroy(err1, (err2) => {
      this.debug('DESTROYED')
      done(err2)
    })
  }
}