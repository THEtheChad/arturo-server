import Promise from 'bluebird'
import { resolve } from 'path';

const Shutdown = {
  actions: [],
  addHandler: function (action, remover) {
    if (typeof action !== 'function')
      throw new Error('action must be a function')
    this.actions.push(action)

    if (remover) {
      remover(() => this.removeHandler(action))
    }
  },
  removeHandler: function (action) {
    const idx = this.actions.indexOf(action)
    this.actions.splice(idx, 1)
  }
}

process.once('SIGINT', async (sig, code) => {
  console.log(`${process.pid} ${sig} ${code} Shutdown Initiated`)

  setInterval(() => console.log(Shutdown.actions.map(action => action.toString())), 3000)

  await Promise.map(Shutdown.actions, async action => {
    if (!action) return

    const timer = setInterval(() => {
      console.log(action.toString())
    }, 2000)

    // check function parity
    if (action.length >= 3) {
      const args = Array(action.length)
      args[0] = code
      args[1] = sig

      await new Promise((resolve, reject) => {
        args[args.length - 1] = (err) => err ? reject(err) : resolve()

        action.apply(null, args)
      })
    } else {
      await action(code, sig)
    }

    clearInterval(timer)

    Shutdown.removeHandler(action)
  })

  console.log('Shutdown complete!')
  console.log('Goodbye.')
  process.exit()
})

export default Shutdown