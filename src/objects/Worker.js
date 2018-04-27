export default class Worker {
  constructor(attrs) {
    if (!attrs.route)
      throw new Error('invalid worker: must specify a route')

    if (!attrs.path)
      throw new Error('invalid worker: must specify a path')

    this.data = {
      route: null,
      active: true,
      concurrency: 1,
      type: 'local',
      path: null,
    }

    this.indexes = ['route']

    Object.assign(this.data, attrs)
  }

  toJSON() {
    return this.data
  }

  toString() {
    return JSON.stringify(this.toJSON())
  }

  where(attrs) {
    return this.indexes.reduce((query, index) => {
      query[index] = this.data[index]
      return query
    }, {})
  }
}