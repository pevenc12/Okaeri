const express = require('express')
const router = express.Router()
const axios = require('axios')
const checkService = require('../auth/checkservice')
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config()
}
const redisClient = require("../models/redisclient")

router.get('/', checkService, checkNewsCache, async (req, res)=>{
  if (req.news == null){
    let url = process.env.NEWS_URL
    url += 'country=tw'
    const cacheKey = 'news_tw'
    const headers = {'X-Api-Key': process.env.NEWS_KEY}
    const results = await axios.get(url, {headers})
    const cacheData = results.data.articles
    redisClient.setex(cacheKey, 1800, JSON.stringify(cacheData))
    req.news = cacheData
  }
  const user = {id: req.session.passport.user, articles: req.news}
  res.render('news/index', {user: user})
})

function checkNewsCache (req, res, next){
  const key = 'news_tw'
  redisClient.get(key, (err, data)=>{
    if (err){
      res.status(500).send(err)
    }
    req.news = null
    if (data != null) {
      req.news = JSON.parse(data)
    }
    next()
  })
}

module.exports = router