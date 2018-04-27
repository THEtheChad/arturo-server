import os from 'os'
import child_process from 'child_process'
import EventEmitter from 'events'

module.exports = function (sequelize, DataTypes) {
  const Job = sequelize.define('Job', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    priority: {
      type: DataTypes.DECIMAL,
      allowNull: false,
      defaultValue: 50,
    },
    status: {
      type: DataTypes.STRING,
      defaultValue: 'scheduled',
      allowNull: false,
    },
    route: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    params: {
      type: DataTypes.STRING,
      set: function (json) {
        let value = null

        if (json && Object.keys(json).length) {
          value = JSON.stringify(json)
        }

        this.setDataValue('params', value)
      },
      get: function () {
        const params = this.getDataValue('params')
        return params ? JSON.parse(params) : {}
      },
    },
    hash: {
      type: DataTypes.STRING,
      set: function (hash) {
        let value = null

        if (hash) value = hash

        this.setDataValue('hash', value)
      },
      get: function () {
        const hash = this.getDataValue('hash')
        return hash || ''
      },
    },
    attempts: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
    },
    maxAttempts: {
      type: DataTypes.INTEGER,
      defaultValue: 7,
    },
    ttl: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0x6ddd00, // 2 hours
      comment: 'in milliseconds',
    },
    errorMsg: DataTypes.STRING,
    errorId: DataTypes.STRING,
    backoff: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'exponential',
    },
    interval: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 20,
      comment: 'in milliseconds',
    },
    lastServer: DataTypes.INTEGER,
    lock: DataTypes.INTEGER,
    scheduledDate: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: false,
    },
    initialDate: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: false,
    },
    startDate: DataTypes.DATE,
    finishDate: DataTypes.DATE,
  })

  Job.associate = function () { }

  return Job
};
