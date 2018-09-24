import Koa from 'koa'
import Router from 'koa-router'

export default class Monitor {
  constructor() {
    this.app = new Koa()
    this.router = new Router()
  }

  listen(port) {
    this.app
      .use(this.router.routes())
      .use(this.router.allowedMethods())
      .listen(port)

    return this
  }
}