const Arturo = require('./lib')

module.exports = new Arturo.Server({
  host: process.env.arturo_db_host,
  username: process.env.arturo_db_username,
  password: process.env.arturo_db_password,
  database: process.env.arturo_db_database,
  dialect: process.env.arturo_db_dialect,
  port: process.env.arturo_db_port,
})