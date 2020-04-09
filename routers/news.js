const express = require('express')
const router = express.Router()
const axios = require('axios')
const checkService = require('../auth/checkservice')
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config()
}

router.get('/', checkService, async (req, res)=>{
  let url = process.env.NEWS_URL
  url += 'country=tw'
  const headers = {'X-Api-Key': process.env.NEWS_KEY}
  const results = await axios.get(url, {headers})
  const user={id : req.session.passport.user, articles: results.data.articles}
  res.render('news/index', {user: user})
})

module.exports = router