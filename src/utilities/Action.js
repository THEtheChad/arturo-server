export default class Action {
  constructor(error, payload, meta = {}) {
    if (payload instanceof Action)
      return payload

    this.meta = meta
    this.payload = payload
    this.error = error
    this.errorMsg = error ? error.message : null
    this.errorId = error ? error.id : null
  }
}