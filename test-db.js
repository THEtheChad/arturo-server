const Sequelize = require('sequelize')

const sequelize = new Sequelize(
  'TestDatabase',
  'root',
  '', {
    dialect: 'mysql',
    logging: false,
    operatorsAliases: false,
  })

module.exports = sequelize