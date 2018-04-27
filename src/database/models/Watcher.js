module.exports = function (sequelize, DataTypes) {
  const Watcher = sequelize.define('Watcher', {
    email: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    route: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    digest: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  }, {
      timestamps: false,
    })

  Watcher.associate = ({ Watcher, Job }) => {
    Job.hasMany(Watcher, {
      foreignKey: 'route',
      sourceKey: 'route',
      constraints: false,
      as: 'watchers'
    })
  }

  return Watcher
}
