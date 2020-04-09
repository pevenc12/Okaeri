const express = require('express')
const router = express.Router()
const client = require('../models/pgclient')
const checkService = require('../auth/checkservice')

router.post('/:id', checkService, async(req, res)=>{
  try{
    let content = req.body.content.slice(0, 140)
    await client.query(`INSERT INTO articles (user_id, created, content) 
      VALUES ('${req.params.id}', to_timestamp(${Date.now()} / 1000.0), '${content}');`)
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
    res.redirect('/')
  }catch{
    res.redirect('/')
  }
})

router.delete('/:id', checkService, async(req, res)=>{
  try{
    const article = await checkUser(req.session.passport.user, parseInt(req.params.id))
    if (article == null) return res.redirect('/')
    const results = await client.query(`DELETE FROM articles
      WHERE id = ${req.params.id}`)
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

async function checkUser(id_user, id_article){
  const article = await client.query(`SELECT id, user_id, content
    FROM articles WHERE id = ${id_article}`)
  if (article.rows.length>0 && article.rows[0].user_id === id_user)
    return article.rows[0]
  return null
}


module.exports = router