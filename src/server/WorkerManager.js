import path from 'path'
import fs from 'fs-extra'
import sanitize from 'sanitize-filename'
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

    this.dir = {
      logs: path.join(process.cwd(), '__logs__'),
      env: path.join(process.cwd(), '__environments__', `${global.server.port}`)
    }
    fs.ensureDirSync(this.dir.logs)

    Shutdown.addHandler((code, sig, done) => this.destroy(null, done))
  }

  _stats() {
    return {
      workers: this._readableState.length,
      processes: WorkerManager.QUEUE._stats()
    }
  }

  _perform(computation) {
    if (this.destroyed) return

    const worker = computation.payload
    const { sequelize } = this
    const { path: dir, route } = worker

    const env = fs.readJsonSync(path.join(this.dir.env, `${sanitize(worker.route)}.json`))
    const stdio = ['ignore', 'ignore', 'ignore', 'ipc']

    WorkerManager.QUEUE.write({
      path: dir,
      opts: { env },
      onSpawn: (subprocess) => {
        this.debug(`WORKER ${subprocess.pid} ${worker.route}: initializing`)

        subprocess.on('message', async (msg) => {
          if (msg.type !== 'queue') return
          const nonce = msg.meta.nonce

          try {
            await this.sequelize.models.Job.create(msg.payload)
            subprocess.send({
              type: 'queue',
              payload: 'success',
              meta: { nonce }
            })
          } catch (err) {
            const errId = this.logError(err)
            subprocess.send({
              type: 'queue',
              payload: 'error',
              err,
              meta: { nonce, errId, errMsg: err.message }
            })
          }
        })

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