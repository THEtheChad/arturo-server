module.exports = function (sequelize, DataTypes) {
  const Route = sequelize.define('Worker', {
    id: {
      primaryKey: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      unique: 'worker',
    },
    serverId: {
      type: DataTypes.INTEGER,
      unique: 'worker',
      allowNull: false,
    },
    route: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    type: {
      type: DataTypes.STRING,
      defaultValue: 'local'
    },
    path: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  })

  Route.associate = function () { }

  return Route
};
