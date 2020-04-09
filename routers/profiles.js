const express = require('express')
const router = express.Router()
const client = require('../models/pgclient')
const Relationship = require('../models/relationship')
const checkService = require('../auth/checkservice')


router.get('/:id', checkService, async (req, res)=>{
  const target_id = parseInt(req.params.id)
  // check if id exists
  let target = await checkUserExist(target_id)
  if (target == null){
    return res.status(404).send('User Not Found')
  }
  // check if self and target are friends
  const self = await Relationship.findOne({ id: req.session.passport.user})
  const user = {
    id: target.id,
    name: target.name,
    alreadyFriend: false,
    myself: false,
    alreadySentRequest: self.sentList.includes(target_id),
    friendRequests: [],
    articles: []
  }
  if (self.friends.includes(target_id) || self.id === target.id){
    user.email = target.email
    user.others = target.others
    user.alreadyFriend = true
    user.articles = await findArticles(target_id)
  }
  if (self.id === target_id){
    const friendRequests = await findFriendRequests(self)
    user.friendRequests = friendRequests
    user.myself = true
  }

  res.render('profiles/index', {user: user})
})

router.delete('/friendship/:id', checkService, async(req, res)=>{
  const target_id = parseInt(req.params.id)
  // check if id exists
  let target = await checkUserExist(target_id)
  if (target == null){
    return res.status(404).send('User Not Found')
  }
  await deleteFriendship(req.session.passport.user, target_id)
  res.redirect(`/profiles/${target_id}`)
})

router.post('/friendrequest/:id', checkService, async (req, res)=>{
  const target_id = parseInt(req.params.id)
  // check if id exists
  let target = await checkUserExist(target_id)
  if (target == null){
    return res.status(404).send('User Not Found')
  }
  await addFriendRequest(req.session.passport.user, target_id)
  res.redirect(`/profiles/${target_id}`)
})

router.delete('/friendrequest/:id', checkService, async (req, res)=>{
  const target_id = parseInt(req.params.id)
  // check if id exists
  let target = await checkUserExist(target_id)
  if (target == null){
    return res.status(404).send('User Not Found')
  }
  await deleteFriendRequest(req.session.passport.user, target_id)
  res.redirect(`/profiles/${target_id}`)
})

router.post('/friendconfirm/:id', checkService, async(req, res)=>{
  const target_id = parseInt(req.params.id)
  // check if id exists
  let target = await checkUserExist(target_id)
  if (target == null){
    return res.status(404).send('User Not Found')
  }
  const self = await Relationship.findOne({ id: req.session.passport.user})
  await deleteFriendRequest(target_id, self.id)
  await addFriends(target_id, self.id)
  res.redirect(`/profiles/${self.id}`)
})

router.delete('/friendconfirm/:id', checkService, async(req, res)=>{
  const target_id = parseInt(req.params.id)
  // check if id exists
  let target = await checkUserExist(target_id)
  if (target == null){
    return res.status(404).send('User Not Found')
  }
  const self = await Relationship.findOne({ id: req.session.passport.user})
  await ignoreFriendRequest(target_id, self.id)
  res.redirect(`/profiles/${self.id}`)
})

async function checkUserExist(target_id){
  let target = await client.query(`SELECT * FROM users
    WHERE id = ${target_id};`)
  if (target.rows.length == 0){
    return null
  }
  else{
    return target.rows[0]
  }
}

async function deleteFriendship(id_send, id_accept){
  try{
    const rel_send = await Relationship.findOne({ id: id_send})
    const rel_accept = await Relationship.findOne({ id: id_accept})
    const pos_send = rel_send.friends.findIndex(
      element => element === id_accept)
    const pos_accept = rel_accept.friends.findIndex(
      element => element === id_send)
    if (pos_send >= 0){
      rel_send.friends.splice(pos_send, 1)
      await rel_send.save()
    }
    if (pos_accept >= 0){
      rel_accept.friends.splice(pos_accept, 1)
      await rel_accept.save()
    }
  }catch(e){
    console.log(e)
  }
}

async function addFriendRequest(id_send, id_accept){
  try{
    const rel_send = await Relationship.findOne({ id: id_send})
    const rel_accept = await Relationship.findOne({ id: id_accept})
    if (!rel_send.sentList.includes(id_accept)){
      rel_send.sentList.push(id_accept)
      await rel_send.save()
    }
    if (!rel_accept.waitList.includes(id_send)){
      rel_accept.waitList.push(id_send)
      await rel_accept.save()
    }
  }catch(e){
    console.log(e)
  }
}

async function deleteFriendRequest(id_send, id_accept){
  try{
    const rel_send = await Relationship.findOne({ id: id_send})
    const rel_accept = await Relationship.findOne({ id: id_accept})
    const pos_send = rel_send.sentList.findIndex(
      element => element === id_accept)
    const pos_accept = rel_accept.waitList.findIndex(
      element => element === id_send)
    if (pos_send >= 0){
      rel_send.sentList.splice(pos_send, 1)
      await rel_send.save()
    }
    if (pos_accept >= 0){
      rel_accept.waitList.splice(pos_accept, 1)
      await rel_accept.save()
    }
  }catch(e){
    console.log(e)
  }
}

async function ignoreFriendRequest(id_send, id_accept){
  try{
    const rel_accept = await Relationship.findOne({ id: id_accept})
    const pos_accept = rel_accept.waitList.findIndex(
      element => element === id_send)
    if (pos_accept >= 0){
      rel_accept.waitList.splice(pos_accept, 1)
      await rel_accept.save()
    }
  }catch(e){
    console.log(e)
  }
}

async function findFriendRequests(self){
  if (self.waitList.length == 0) return []
  let req_str = ''
  self.waitList.forEach(element => {
    req_str += element.toString() + ','
  })
  req_str = req_str.slice(0, -1)
  const target = await client.query(`SELECT id, name FROM users
    WHERE id IN (${req_str});`)
  return target.rows
}

async function addFriends(ida, idb){
  try{
    let rel_a = await Relationship.findOne({ id: ida})
    let rel_b = await Relationship.findOne({ id: idb})
    rel_a.friends.push(idb)
    rel_b.friends.push(ida)
    await rel_a.save()
    await rel_b.save()
  }catch(e){
    console.log(e)
  }
}

async function findArticles(id){
  const results = await client.query(`
    SELECT id, created, edited, content 
    FROM articles
    WHERE user_id = ${id}
    ORDER BY created DESC;`)
  return results.rows
}

module.exports = router