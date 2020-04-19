if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config()
}
const express = require('express')
const app = express()
const flash = require('express-flash')
const session = require('express-session')
const passport = require('passport')
const methodOverride = require('method-override')
const path = require('path')
const userRouter = require('./routers/users')
const articleRouter = require('./routers/articles')
const profileRouter = require('./routers/profiles')
const newsRouter = require('./routers/news')
const searchRouter = require('./routers/search')
const Relationship = require('./models/relationship')

//redis
const redis = require("redis")
const redisClient = require("./models/redisclient")
redisClient.auth(process.env.REDIS_PASS)

//mongoDB
const mongoose = require('mongoose')
mongoose.connect(process.env.MONGODB_URL,
  { useNewUrlParser: true, useUnifiedTopology:true, useCreateIndex: true })
const db = mongoose.connection
db.on('error', (err)=> console.error(err))

//postgresql
const client = require('./models/pgclient')
client.connect()

//passport
const initializePassport = require('./auth/passport-config')
initializePassport(
  passport,
  async (email) =>  {
    const result = await client.query(`SELECT * FROM users
      WHERE email = '${email}';`)
    return result.rows
  },
  async (id) => {
    const result = await client.query(`SELECT * FROM users
      WHERE id = '${id}';`)
    return result.rows[0]
  }
)

app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, 'views'))
app.use(express.urlencoded({ extended: false }))
app.use(flash())
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false
}))
app.use(passport.initialize())
app.use(passport.session())
app.use(methodOverride('_method'))

//index
app.get('/', checkNotAuthenticated, checkIndexCache, async (req, res)=>{
  if (req.indexArticles == null){
    const cacheKey = 'index_' + req.session.passport.user.toString()
    const indexArticles = await findIndexArticles(req.session.passport.user)
    redisClient.setex(cacheKey, 300, JSON.stringify(indexArticles))
    req.indexArticles = indexArticles
  }
  const user = {id: req.session.passport.user}
  res.render('index', {user: user, indexArticles: req.indexArticles})
})

//routers
app.use('/users', userRouter)
app.use('/articles', articleRouter)
app.use('/profiles', profileRouter)
app.use('/news', newsRouter)
app.use('/search', searchRouter)

//functions
function checkIndexCache (req, res, next){
  const key = 'index_' + req.session.passport.user.toString()
  redisClient.get(key, (err, data)=>{
    if (err){
      res.status(500).send(err)
    }
    req.indexArticles = null
    if (data != null) {
      req.indexArticles = JSON.parse(data)
    }
    next()
  })
}

function checkNotAuthenticated(req, res, next){
  if (!req.isAuthenticated()){
    return res.render('users/login')
  }
  next()
}

async function findIndexArticles(id){
  let search_id = await Relationship.findOne({id: id})
  search_id = search_id.friends
  search_id.push(id)
  search_id_str = ''
  search_id.forEach(element => {
    search_id_str += element.toString() + ','
  })
  search_id_str = search_id_str.slice(0, -1)
  // find friends' info
  let userFriendsInfo = await client.query(`SELECT id, name
    FROM users WHERE id IN (${search_id_str})`)
  userFriendsInfo = userFriendsInfo.rows
  let friends = {}
  userFriendsInfo.forEach(info=>{
    friends[info.id] = info.name
  })
  //find friends' articles
  let results = await client.query(`SELECT * FROM articles
    WHERE user_id IN (${search_id_str})
    ORDER BY created DESC
    LIMIT 100;`)
  results = results.rows
  results.forEach(article => {
    article.user_name = friends[article.user_id.toString()]
    article.user_self = (article.user_id === id) ? true : false
  })
  return results
}

app.listen(process.env.PORT || 3000)