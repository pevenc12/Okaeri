const express = require('express')
const router = express.Router()
const passport = require('passport')
const bcrypt = require('bcrypt')
const client = require('../models/pgclient')
const Relationship = require('../models/relationship')

router.get('/register', checkLog, (req, res)=>{
  res.render('users/register')
})

router.post('/register', checkLog, async(req, res)=>{
  try{
    const result = await client.query(`SELECT COUNT(*) FROM users 
      WHERE email = '${req.body.email}';`)
    if (result.rows[0].count != 0) {
      return res.redirect('/users/register')
    }
    else{
      const hashedPassword = await bcrypt.hash(req.body.password, 10)
      await client.query(`INSERT INTO users (email, name, password) 
        VALUES ('${req.body.email}', '${req.body.name}', '${hashedPassword}');`)
      let _id = await client.query(`SELECT id FROM users WHERE email = '${req.body.email}'`)
      _id = _id.rows[0].id
      await initFriends(_id)
      res.redirect('/users/login')
    }
  }catch{
    res.redirect('/')
  }
})

router.get('/login', checkLog, (req, res)=>{
  res.render('users/login')
})

router.post('/login', checkLog, passport.authenticate('local', {
  successRedirect: '/',
  failureRedirect: '/users/login',
  failureFlash: true
}))

router.delete('/logout', (req, res)=>{
  req.logOut()
  res.redirect('/')
})

function checkLog(req, res, next){
  if (req.isAuthenticated()){
    return res.redirect('/')
  }
  next()
}

async function initFriends(id){
  try{
    let rel = new Relationship({
      id: id,
      friends : [],
      waitList: [],
      sentList: []
    })
    rel = await rel.save()
  }catch(e){
    console.log(e)
  }
}


module.exports = router