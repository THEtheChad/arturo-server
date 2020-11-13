import Debug from 'debug';
import stream from 'stream';
import uuid from '../utilities/uuid';
import Shutdown from '../server/Shutdown';

export default class QueryWorkerJobs extends stream.Readable {
	constructor(opts) {
		super(
			Object.assign(
				{
					highWaterMark: 0,
					objectMode: true
				},
				opts
			)
		);

		const { Op } = opts.sequelize;

		this.uuid = `${this.constructor.name}-${process.pid}-${uuid()}`;
		this.debug = Debug(`arturo:${this.uuid}`);

		this.sequelize = opts.sequelize;
		this.where = {
			route: opts.worker.route,
			status: ['scheduled', 'retry'],
			scheduledDate: { [Op.lte]: new Date() },
			lock: null
		};

		Shutdown.addHandler(
			(code, sig, done) => this.destroy(null, done),
			(remove) => this.once('end', remove)
		);
	}

	async _read() {
		const { sequelize } = this;
		const { Job } = sequelize.models;

		try {
			let instance = null;
			await sequelize.transaction(async (transaction) => {
				instance = await Job.findOne({
					where: this.where,
					lock: transaction.LOCK.UPDATE,
					transaction
				});

				if (instance) {
					const serverId = global.server ? global.server.id : -1;
					await instance.update(
						{
							lastServer: serverId,
							lock: serverId
						},
						{ transaction }
					);
				}
			});

			if (this.destroyed) return;
			this.push(instance ? instance.toJSON() : null);
		} catch (err) {
			console.error(`${this.uuid}: DATABASE ERROR`);
			console.error(err);
			this.emit('error', err);
		}
	}

	_destroy(err, done) {
		this.push(null);
		this.debug('DESTROYED');
		done(err);
	}
}
