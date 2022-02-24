const express = require('express')
const bodyParser = require('body-parser')
const app = express()
const port = 3000

app.use(bodyParser.json())

let users = [
  {
    id: 1,
    firstName: "Matti",
    lastName: "Meikälainen",
    dateOfBirth: "1984-07-26",
    city: "Oulu",
    county: "Pohjois-Pohjanmaa",
    country: "Finland",
    email: "matti.meikalainen@email.com",
    emailVerified: true,
    username: "MattiM",
    password: "#123456abcde"
  },
  {
    id: 2,
    firstName: "Liisa",
    lastName: "Ihmemaa",
    dateOfBirth: "1990-11-05",
    city: "Tampere",
    county: "Pirkanmaa",
    country: "Finland",
    email: "liisa.ihmemaa@email.com",
    emailVerified: true,
    username: "Lizzu90",
    password: "102938_akdjfh"
  }
]

app.get('/', (req, res) => {
  res.send('Hello World')
})

app.get('/users/:userId', (req, res) => {
  const id = Number(req.params.userId)
  const user = users.find(user => user.id === id)

  if (user) {
    res.json(user)
  } else {
    res.sendStatus(404)
  }
})

app.delete('/users/:userId', (req, res) => {
  const id = Number(req.params.userId)
  const user = users.find(user => user.id === id)

  if (user) {
    users = users.filter(user => user.id !== id)
    res.sendStatus(204)
  } else {
    res.sendStatus(404)
  }
})

const generateId = ([...arr]) => {
  const maxId = arr.length > 0
    ? Math.max(...arr.map(n => n.id))
    : 0
  return maxId + 1
}

app.post('/users', (req, res) => {
  console.log(generateId(users))
  res.sendStatus(201)
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})