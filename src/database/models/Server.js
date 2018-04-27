module.exports = function (sequelize, DataTypes) {
  const Server = sequelize.define('Server', {
    host: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: 'server',
    },
    domain: {
      type: DataTypes.STRING,
      unique: 'server',
    },
    port: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: 'server',
    },
    pid: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: 'server',
    },
    active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    keepAlive: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      set: function () {
        this.setDataValue('keepAlive', new Date)
      }
    },
  })

  Server.associate = function ({ Server, Worker }) {
    Server.hasOne(Worker, { foreignKey: 'serverId' })
    Worker.belongsTo(Server, { foreignKey: 'serverId' })
  }

  return Server;
}
