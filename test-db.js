const Sequelize = require('Sequelize')
const sequelize = new Sequelize({
  dialect: 'mysql'
})

module.exports = sequelize