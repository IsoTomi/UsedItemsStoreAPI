const express = require('express')
const passport = require('passport')
const jwt = require('jsonwebtoken')

//const secrets = require('./secrets.json')

const app = express()
const port = process.env.PORT || 80

// JSON body-parser middleware. Express 4.16+ has it's own body-parser
// so no third party package is needed.
app.use(express.json())

// Routes
const users = require('./routes/users')
const items = require('./routes/items')

app.use('/users', users)
app.use('/items', items)

// Cookie parser
const cookieParser = require('cookie-parser')
app.use(cookieParser(secrets.jwtSignKey));

app.get("/", (req, res) => {
  res.send("Hello World!")
})

// POST /singin - Sing in operation.
app.post('/signin', passport.authenticate('basic', { session: false }), (req, res) => {
  const payloadData = {
    userId: req.user.id
  }

  const token = jwt.sign(payloadData, secrets.jwtSignKey)
  res.cookie('userId', req.user.id, {signed: true})
  res.json({ token: token })
})


app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})