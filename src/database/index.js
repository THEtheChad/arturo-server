import fs from 'fs';
import path from 'path';
import Sequelize from 'sequelize';

export default function (_config, opts = {}) {
	const config = Object.assign(
		{
			logging: false,
			operatorsAliases: false,
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

	const model_dir = path.join(__dirname, 'models');
	fs.readdirSync(model_dir).forEach((filename) =>
		sequelize.import(path.join(model_dir, filename))
	);

	const { models } = sequelize;
	for (let name in models) {
		models[name].associate && models[name].associate(models);
	}

	sequelize.initialized = sequelize.sync(opts);
	sequelize.Sequelize = Sequelize;

	return sequelize;
}
