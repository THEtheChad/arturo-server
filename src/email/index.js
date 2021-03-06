import fs from 'fs'
import path from 'path'
import Debug from 'debug'
import moment from 'moment'
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

    job.startDate = moment(job.startDate)
    job.finishDate = moment(job.finishDate)

    switch (job.status) {
      case 'completed':
        job.duration = moment.duration(job.finishDate.diff(job.startDate)).humanize()
        break;
      case 'failed':
        job.duration = moment.duration(moment(job.updatedAt).diff(job.initialDate)).humanize()
        break
      default:
        return
    }

    job.startDate = job.startDate.calendar()
    job.finishDate = job.finishDate.calendar()

    const title = job.route
      .replace(/\/(.)/g, (m, c) => ' ' + c.toUpperCase())
      .slice(1)

    const config = {
      from: 'automation@exceleratedigital.com',
      subject: `JOBQUEUE: ${title} ${job.status}`,
      bcc: watchers.map(watcher => watcher.email),
      html: nunjucks.render('single/template.html', job),
    }

    const images = path.join(templates, 'single/images')
    const attachments = fs.readdirSync(images).map(filename => ({
      filename,
      path: path.join(images, filename),
      cid: filename
    }))

    if (attachments && attachments.length) {
      config.attachments = attachments
    }

    if (!this.transport) return
    this.debug(`sending mail to ${watchers.length} watchers...`)

    return new Promise((resolve, reject) => {
      this.transport.sendMail(config, (err, info) => err ? reject(err) : resolve(info))
    })

    // @TODO: add debounce for emails so we don't mail too frequentyly
  }
}