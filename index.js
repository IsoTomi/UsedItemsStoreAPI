const express = require('express')
const passport = require('passport')
const jwt = require('jsonwebtoken')

const secrets = require('./secrets.json')

const app = express()
const port = 3000

const users = require('./routes/users')

app.use(express.json())

app.get('/', (req, res) => {
  res.send('Hello World')
})

app.use('/users', users)

app.post('/signin', passport.authenticate('basic', { session: false }), (req, res) => {
  const payloadData = {
    userId: req.user.id
  }

  const token = jwt.sign(payloadData, secrets.jwtSignKey)

  res.json({ token: token })
})


app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})