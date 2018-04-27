import Persist from './Persist'

export default class CRUD {
  constructor(Model) {
    this.model = Model
  }

  create(queue) {
    this.execute(queue, function (object) {
      return this.model.create(object.toJSON())
    })
  }

  destroy(queue) {
    this.execute(queue, function (object) {
      return this.model.destroy({ where: object.where() })
    })
  }

  execute(queue, operation) {
    const persist = new Persist(this.model, operation)

    const events = ['record:success', 'record:error']
    events.forEach(event => {
      persist.on(event, payload => queue.emit(event, payload))
    })

    queue.pipe(persist)
  }
}