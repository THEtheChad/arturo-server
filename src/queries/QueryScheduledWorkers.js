import Debug from 'debug';
import stream from 'stream';
import uuid from '../utilities/uuid';
import Shutdown from '../server/Shutdown';

export default class QueryScheduledWorkers extends stream.Readable {
	constructor(sequelize) {
		super({
			highWaterMark: 0,
			objectMode: true
		});

		this.sequelize = sequelize;
		this.uuid = `${this.constructor.name}-${process.pid}-${uuid()}`;
		this.debug = Debug(`arturo:${this.uuid}`);

		Shutdown.addHandler(
			(code, sig, done) => this.destroy(null, done),
			(remove) => this.once('end', remove)
		);
	}

	async fetch() {
		if (this.destroyed) return;
		if (this.readableLength > 0) return;

		// @TODO: limit to one job route
		const [workers] = await this.sequelize.query(
			`
      SELECT *
      FROM Workers
      WHERE
        Workers.active = 1 AND
        Workers.serverId = ${global.server.id} AND
        Workers.route IN (
          SELECT Jobs.route
          FROM Jobs
          WHERE
              Jobs.status IN ('scheduled', 'retry') AND
              Jobs.scheduledDate <= Convert(datetime, '${new Date()}' )
            GROUP BY Jobs.route
        )j
    `
		);

		this.debug(`found ${workers.length} worker(s) with scheduled jobs...`);
		workers.forEach((worker) => {
			if (!this.destroyed) this.push(worker);
		});
	}

	_read() {}

	_destroy(err, done) {
		this.push(null);
		this.debug('DESTROYED');
		done(err);
	}
}
