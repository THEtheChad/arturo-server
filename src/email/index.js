import path from 'path'
import Debug from 'debug'
import nunjucks from 'nunjucks'
import { debounce } from 'lodash'
import nodemailer from 'nodemailer'
import uuid from '../utilities/uuid'

const templates = path.join(__dirname, 'templates')
nunjucks.configure(templates, { autoescape: true })

export default class Email {
  constructor(config) {
    if (config) {
      this.transport = nodemailer.createTransport(config)
    }

    this.uuid = `${this.constructor.name}-${process.pid}-${uuid()}`
    this.debug = Debug(`arturo:${this.uuid}`)
  }

  send(job, watchers) {
    if (!watchers.length) return

    switch (job.status) {
      case 'completed':
      case 'failed':
        break
      default:
        return
    }

    this.debug(`${job.id} ${watchers.map(watcher => watcher.email)}`)
    return

    const title = job.route
      .replace(/\/(.)/g, (m, c) => ' ' + c.toUpperCase())
      .slice(1)

    const config = {
      from: 'automation@exceleratedigital.com',
      subject: `${title} ${job.status}`,
      bcc: watchers.map(watcher => watcher.email),
      html: nunjucks.render('single.html', job)
    }

    console.log(config)

    if (!this.transport) return

    return new Promise((resolve, reject) => {
      this.transport.sendMail(config, (err, info) => err ? reject(err) : resolve(info))
    })

    // @TODO: add debounce for emails so we don't mail too frequentyly
  }
}