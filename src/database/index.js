import fs from 'fs';
import path from 'path';
import { Sequelize, DataTypes } from 'sequelize';

export default function (_config, opts = {}) {
	const config = Object.assign(
		{
			dialectOptions: {
				validateBulkLoadParameters: false
			},
			logging: false,
			pool: {
				maxUses: 6
			}
		},
		_config
	);

	const sequelize = new Sequelize(
		_config.database,
		_config.username,
		_config.password,
		config
	);

	sequelize.models = sequelize.models || {};
	const model_dir = path.join(__dirname, 'models');
	fs.readdirSync(model_dir).forEach((filename) => {
		const factory = require(path.join(model_dir, filename));

		factory(sequelize, DataTypes);
	});

	const { models } = sequelize;
	for (let name in models) {
		models[name].associate && models[name].associate(models);
	}

	sequelize.initialized = Promise.resolve(); // sequelize.sync(opts);
	sequelize.Sequelize = Sequelize;

	return sequelize;
}
