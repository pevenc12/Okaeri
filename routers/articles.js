const express = require('express')
const router = express.Router()
const client = require('../models/pgclient')
const checkService = require('../auth/checkservice')
const Relationship = require('../models/relationship')
const redisClient = require("../models/redisclient")

router.post('/:id', checkService, async(req, res)=>{
  try{
    let content = req.body.content.slice(0, 140)
    await client.query(`INSERT INTO articles (user_id, created, content) 
      VALUES ('${req.params.id}', to_timestamp(${Date.now()} / 1000.0), '${content}');`)
    redisClient.del(`index_${req.session.passport.user}`)
    res.redirect('/')
  }catch{
    res.redirect('/')
  }
})

router.put('/:id', checkService, async(req, res)=>{
  try{
    const article = await checkUser(req.session.passport.user, parseInt(req.params.id))
    if (article == null) return res.redirect('/')
    const result = client.query(`UPDATE articles 
      SET content = '${req.body.content}', edited = to_timestamp(${Date.now()} / 1000.0)
      WHERE id = ${article.id};`)
    redisClient.del(`index_${req.session.passport.user}`)
    res.redirect('/')
  }catch{
    res.redirect('/')
  }
})

router.delete('/:id', checkService, async(req, res)=>{
  try{
    const article = await checkUser(req.session.passport.user, parseInt(req.params.id))
    if (article == null) return res.redirect('/')
    await client.query(`DELETE FROM articles
      WHERE id = ${req.params.id}`)
    redisClient.del(`index_${req.session.passport.user}`)
    res.redirect('/')
  }catch{
    res.redirect('/')
  }
})

router.get('/edit/:id', checkService, async(req, res)=>{
  try{
    let article = await checkUser(req.session.passport.user , parseInt(req.params.id))
    if (article == null) return res.redirect('/')
    res.render('articles/edit', {article: article})
  }catch{
    res.redirect('/')
  }
})

router.get('/show/:id', checkService, async(req, res)=>{
  try{
    const isFriend = await checkFriend(req.session.passport.user, parseInt(req.params.id))
    if (!isFriend) res.redirect('/')
    const article = await findArticle(req.session.passport.user, parseInt(req.params.id))
    const user = {id: req.session.passport.user}
    const replies = await findReply(parseInt(req.params.id))
    res.render('articles/show', {user: user, article: article, replies: replies})
  }catch{
    res.redirect('/')
  }
})

router.get('/like/:id', checkService, async(req, res)=>{
  try{
    const isFriend = await checkFriend(req.session.passport.user, parseInt(req.params.id))
    if (!isFriend) res.redirect('/')
    const article = await findArticle(req.session.passport.user, parseInt(req.params.id))
    let likes = article.likes
    let userLikes = (article.likes_user == null) ? [] : article.likes_user
    if (userLikes.indexOf(req.session.passport.user) !== -1){
      await client.query(`UPDATE articles SET likes = ${likes-1},
      likes_user = array_remove(likes_user, ${req.session.passport.user}) WHERE id = ${req.params.id};`) 
    }
    else{
      await client.query(`UPDATE articles SET likes = ${likes+1},
      likes_user = likes_user || ${req.session.passport.user} WHERE id = ${req.params.id};`) 
    }
    res.redirect(`/articles/show/${req.params.id}`)
  }catch{
    res.redirect('/')
  }
})

router.post('/reply/:id', checkService, async(req, res)=>{
  try{
    const isFriend = await checkFriend(req.session.passport.user, parseInt(req.params.id))
    if (!isFriend) res.redirect('/')
    let reply = req.body.reply.slice(0, 140)
    await client.query(`INSERT INTO replies (user_id, article_id, created, content) 
      VALUES ('${req.session.passport.user}', ${req.params.id}, 
      to_timestamp(${Date.now()} / 1000.0), '${reply}');`)
    res.redirect(`/articles/show/${req.params.id}`)
  }catch{
    res.redirect('/')
  }
})

async function checkUser(id_user, id_article){
  const article = await client.query(`SELECT id, user_id, content
    FROM articles WHERE id = ${id_article};`)
  if (article.rows.length>0 && article.rows[0].user_id === id_user)
    return article.rows[0]
  return null
}

async function checkFriend(id_user, id_article){
  const article = await client.query(`SELECT user_id FROM articles
    WHERE id = ${id_article};`)
  if (article.rows.length === 0) return false
  const author = await Relationship.findOne({id: article.rows[0].user_id})
  author.friends.push(author.id)
  if (author.friends.includes(id_user)) return true
  return false
}

async function findArticle(id_user, id_article){
  const article = await client.query(`SELECT * FROM articles
    WHERE id = ${id_article};`)
  let authorName = await client.query(`SELECT name FROM users WHERE
  id = ${article.rows[0].user_id};`)
  article.rows[0].user_self = (article.rows[0].user_id === id_user) ? true : false
  article.rows[0].user_name = authorName.rows[0].name
  return article.rows[0]
}


async function findReply(id_article){
  const replies = await client.query(`SELECT user_id, name, created, content, likes, likes_user
    FROM (replies r INNER JOIN users u 
    ON r.user_id = u.id AND r.article_id = ${id_article})
    ORDER BY created;`)
  return replies.rows
}


module.exports = router