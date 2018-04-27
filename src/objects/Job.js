const TWO_HOURS = 7200000

export default class Job {
  constructor(attrs) {
    if (!attrs.route)
      throw new Error('invalid job: must specify a route')

    this.data = {
      id: null,
      status: 'scheduled',
      route: null,
      params: null,
      hash: null,
      attempts: 0,
      maxAttempts: null,
      ttl: TWO_HOURS,
      error: null,
      backoff: 'exponential',
      interval: 20,
      lastServer: null,
      scheduledDate: new Date().toISOString(),
      initialDate: new Date().toISOString(),
      startDate: null,
      finishDate: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    this.indexes = ['id']

    Object.assign(this.data, attrs)
  }

  toJSON() {
    return this.data
  }

  toString() {
    return JSON.stringify(this.toJSON())
  }
}