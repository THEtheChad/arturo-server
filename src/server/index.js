import os from 'os';
import Debug from 'debug';
import moment from 'moment';
import database from '../database';

import { Op } from 'sequelize';

// Modules
import WorkerManager from './WorkerManager';
import Registrar from './Registrar';
import CreateWorker from './CreateWorker';
import DestroyWorker from './DestroyWorker';
import Notifier from './Notifier';
import ScheduleRetries from './ScheduleRetries';
import Shutdown from './Shutdown';
import Monitor from './Monitor';

// Queries
import QueryScheduledWorkers from '../queries/QueryScheduledWorkers';
import QueryBackoffJobs from '../queries/QueryBackoffJobs';

// Utilities
import Queue from '../utilities/Queue';
import CRUD from '../utilities/CRUD';
import uuid from '../utilities/uuid';

// process.on('unhandledRejection', err => console.error('unhandled', err))
const PORT = 1728;

export default class Server {
	static Database = database;

	constructor(config) {
		this.sequelize = database(config);

		this.uuid = `${this.constructor.name}-${process.pid}-${uuid()}`;
		this.debug = Debug(`arturo:${this.uuid}`);
		const monitor = (this.monitor = new Monitor());

		this.initialized = this.sequelize.initialized.then(async () => {
			const where = {
				host: os.hostname(),
				domain: null,
				port: 61681
			};
			const defaults = Object.assign(
				{
					pid: process.pid,
					keepAlive: new Date()
				},
				where
			);

			// register with the database
			const [instance] = await this.sequelize.models.Server.findOrCreate({
				where,
				defaults
			});

			global.server = this.instance = instance;

			this.initRegistrar(monitor);
			this.initJobRunner(monitor);
			this.initJobScheduler(monitor);

			this.trigger('scheduleJobs', moment.duration(10, 'seconds'));
			this.trigger('jobRunner', moment.duration(10, 'seconds'));
			this.trigger('markActiveServers', moment.duration(5, 'minutes'));
			this.trigger('markInactiveServers', moment.duration(5, 'minutes'));
			this.trigger('keepAlive', moment.duration(5, 'minutes'));

			monitor.listen(PORT);
		});

		this.enabled = true;
		Shutdown.addHandler(() => (this.enabled = false));
	}

	async trigger(method, timing) {
		if (!this.enabled) return;
		await this[method]();
		setTimeout(() => this.trigger(method, timing), timing);
	}

	initJobRunner(monitor) {
		const sequelize = this.sequelize;
		const notifier = new Notifier(sequelize);
		const manager = new WorkerManager({
			sequelize,
			notifier
		});

		monitor.router.get('/stats', (ctx, next) => {
			ctx.body = JSON.stringify(manager._stats(), null, 2);
		});

		this.scheduledWorkers = new QueryScheduledWorkers(sequelize);
		this.scheduledWorkers.pipe(manager);
	}

	initJobScheduler(trigger) {
		const sequelize = this.sequelize;
		this.backoffJobs = new QueryBackoffJobs(sequelize);

		this.backoffJobs.pipe(new ScheduleRetries({ sequelize }));
	}

	async scheduleJobs() {
		this.backoffJobs.fetch();
	}

	async jobRunner() {
		this.scheduledWorkers.fetch();
	}

	async markActiveServers() {
		const { Op, models } = this.sequelize;
		const { Server } = models;

		try {
			await this.sequelize.transaction(async (transaction) => {
				const [count] = await Server.update(
					{ active: true },
					{
						where: {
							active: false,
							keepAlive: {
								[Op.gt]: moment().subtract(10, 'minutes')
							}
						},
						lock: transaction.LOCK.UPDATE,
						transaction
					}
				);

				this.debug(`found ${count} newly active server(s)...`);
			});
		} catch (err) {
			console.error(`DATABASE ERROR: server#markActiveServers`);
			console.error(err);
		}
	}

	async markInactiveServers() {
		const { Op, models } = this.sequelize;
		const { Server } = models;

		try {
			await this.sequelize.transaction(async (transaction) => {
				const [count] = await Server.update(
					{ active: false },
					{
						where: {
							active: true,
							keepAlive: {
								[Op.lt]: moment().subtract(10, 'minutes')
							}
						},
						lock: transaction.LOCK.UPDATE,
						transaction
					}
				);

				this.debug(`found ${count} newly inactive server(s)...`);
			});
		} catch (err) {
			console.error(`DATABASE ERROR: server#markInactiveServers`);
			console.error(err);
		}
	}

	initRegistrar() {
		const sequelize = this.sequelize;
		const registrar = new Registrar({ port: global.server.port });

		registrar.queue.add.pipe(new CreateWorker({ sequelize }));

		registrar.queue.remove.pipe(new DestroyWorker({ sequelize }));
	}

	async keepAlive() {
		try {
			await this.instance.update({ keepAlive: new Date() });
		} catch (err) {
			console.error(`DATABASE ERROR: server#keepAlive`);
			console.error(err);
		}
	}

	async moniterStaleJobs() {
		// new Reader(this.sequelize.models.Job, {
		//   where: {
		//     status: 'processing',
		//     updatedAt: { [Op.lte]: now - moment.duration(10, 'minutes') }
		//   }
		// })
		// const where =
		// const jobs = await this.sequelize.models.Job.findAll({ where })
		// return Promise.map(jobs, job => {
		//   // @TODO: add handling for stale jobs
		// }, { concurrency: 10 })
	}
}
