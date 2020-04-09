const pg = require('pg')
const conString = process.env.POS_URL
const client = new pg.Client(conString)

module.exports = client