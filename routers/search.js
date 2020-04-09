const express = require('express')
const router = express.Router()
const client = require('../models/pgclient')
const checkService = require('../auth/checkservice')

router.get('/', checkService, (req, res)=>{
  let user = {id: req.session.passport.user}
  res.render('search/index', {user: user, searchResult: [] })
})

router.post('/', checkService, async (req, res)=>{
  let searchResult = await client.query(`SELECT id, name, others
    FROM users WHERE name = '${req.body.username}';`)
  searchResult = searchResult.rows
  let user = {id: req.session.passport.user}
  res.render('search/index', {user: user, searchResult: searchResult})  
})

module.exports = router