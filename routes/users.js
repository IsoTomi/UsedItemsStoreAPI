const express = require('express')
const { v4: uuidv4 } = require('uuid')
const passport = require('passport')
const bcrypt = require('bcryptjs')
const usersRouter = express.Router()
const secrets = require('../secrets.json')

// users - Array for storing information about the users. 
// It's been populated by some example users.
let users = [
  {
    id: uuidv4(),
    firstName: "Matti",
    lastName: "Meikäläinen",
    dateOfBirth: "1984-07-26",
    city: "Oulu",
    county: "Pohjois-Pohjanmaa",
    country: "Finland",
    email: "matti.meikalainen@email.com",
    username: "MattiM",
    password: "#123456abcde",
    items: [
      {
        id: 1
      }
    ]
  },
  {
    id: uuidv4(),
    firstName: "Liisa",
    lastName: "Ihmemaa",
    dateOfBirth: "1990-11-05",
    city: "Tampere",
    county: "Pirkanmaa",
    country: "Finland",
    email: "liisa.ihmemaa@email.com",
    username: "Lizzu90",
    password: "102938_akdjfh",
    items: []
  }
]

// Event handlers
const service = require('../sharedService')

service.onAddItem((userId, itemId) => {
  const user = users.find(user => user.id === userId)
  const item = {id: itemId}
  user.items.push(item)
})

service.onRemoveItem((userId, itemId) => {
  const user = users.find(user => user.id === userId)
  user.items = user.items.filter( item => item.id !== itemId) 
  console.log(user)
  console.log(itemId)
  console.log(user.items)
})

// JSON body-parser middleware. Express 4.16+ has it's own body-parser
// so no third party package is needed.
usersRouter.use(express.json());

// Include items route.
const items = require('./items')
usersRouter.use('/items', items)

// Ajv - JSON schema validator releated
const Ajv = require('ajv')
const ajv = new Ajv()

const userSchema = require('../schemas/user.schema.json')
const userValidator = ajv.compile(userSchema)

const itemSchema = require('../schemas/item.schema.json')
const itemValidator = ajv.compile(itemSchema)

// Passport - HTTP Basic authentication related
const BasicStrategy = require('passport-http').BasicStrategy

passport.use(new BasicStrategy(
  function (username, password, done) {
    let user = users.find(user => (user.username === username) && (bcrypt.compareSync(password, user.password)))

    if (user != undefined) {
      done(null, user)
    } else {
      done(null, false)
    }
  }
))

// Passport - JSON Web Token authentication related
const JwtStrategy = require('passport-jwt').Strategy
const ExtractJwt = require('passport-jwt').ExtractJwt

let jwtValidationOptions = {}
jwtValidationOptions.jwtFromRequest = ExtractJwt.fromAuthHeaderAsBearerToken()
jwtValidationOptions.secretOrKey = secrets.jwtSignKey

passport.use(new JwtStrategy(jwtValidationOptions, function (jwt_payload, done) {
  const user = users.find(u => u.id === jwt_payload.userId)
  done(null, user)
}))

// Cookie parser
const cookieParser = require('cookie-parser')
usersRouter.use(cookieParser(secrets.jwtSignKey));

// My middlewares
// userValidateMW - Is used to validate the user information.
const userValidateMW = (req, res, next) => {
  const validationResult = userValidator(req.body)
  if (validationResult == true) {
    next()
  } else {
    res.sendStatus(400)
  }
}

// itemValidateMW - Is used to validate the item information.
const itemValidateMW = (req, res, next) => {
  const validationResult = itemValidator(req.body)
  if (validationResult == true) {
    next()
  } else {
    res.sendStatus(400)
  }
}


// GET / - Get All User Info
// NOTE: Test purpose only.
usersRouter.get('/', (req, res) => {
  res.json(users)
})

// GET /:userId - Get User Info by User ID
usersRouter.get('/:userId', (req, res) => {
  const id = req.params.userId
  const user = users.find(user => user.id === id)

  if (user) {
    res.json(user)
    res.sendStatus(200)
  } else {
    res.sendStatus(404)
  }
})

// DELETE /:userId - Delete User Info by User ID. JSON Web Token needed.
usersRouter.delete('/:userId', passport.authenticate('jwt', { session: false }), (req, res) => {
  const id = req.params.userId
  const user = users.find(user => user.id === id)

  if (user) {
    users = users.filter(user => user.id !== id)
    res.sendStatus(202)
  } else {
    res.sendStatus(404)
  }
})

// PUT /:userId - Update User Info by User ID. JSON Web Token needed.
usersRouter.put('/:userId', passport.authenticate('jwt', { session: false }), userValidateMW, (req, res) => {
  const id = req.params.userId
  let user = users.find(user => user.id === id)

  if (user) {
    // Hash the password.
    const salt = bcrypt.genSaltSync(6)
    const hashedPassword = bcrypt.hashSync(req.body.password, salt)

    user.firstName = req.body.firstName
    user.lastName = req.body.lastName
    user.dateOfBirth = req.body.dateOfBirth
    user.city = req.body.city
    user.county = req.body.county
    user.country = req.body.country
    user.email = req.body.email
    user.username = req.body.username
    user.password = hashedPassword
    res.sendStatus(202)
  } else {
    res.sendStatus(404)
  }
})

// POST / - Create a New User
usersRouter.post('/', userValidateMW, (req, res) => {
  // TODO: Check if the username is already in use.

  // Hash the password.
  const salt = bcrypt.genSaltSync(6)
  const hashedPassword = bcrypt.hashSync(req.body.password, salt)

  users.push({
    id: uuidv4(),
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    dateOfBirth: req.body.dateOfBirth,
    city: req.body.city,
    county: req.body.county,
    country: req.body.country,
    email: req.body.email,
    username: req.body.username,
    password: hashedPassword,
    items: []
  })

  res.sendStatus(201)
})

// GET /:userId/items - Get User's item IDs
usersRouter.get('/:userId/items', (req, res) => {
  const id = req.params.userId
  const user = users.find(user => user.id === id)

  if (user) {
    res.json(user.items)
    res.sendStatus(200)
  } else {
    res.sendStatus(404)
  }
})

// POST /items - Create a New item
/*usersRouter.post('/items', passport.authenticate('jwt', { session: false }), itemValidateMW, (req, res) => {
  const userId = req.signedCookies['userId']

  if (userId) {
    const item = {
      title: req.body.title,
      description: req.body.description,
      category: req.body.category,
      askingPrice: req.body.askingPrice,
      dateOfPosting: req.body.dateOfPosting,
      deliveryType: req.body.deliveryType,
      sellerId: userId,
      city: req.body.city,
      county: req.body.county,
      country: req.body.country,
    }

    // Emit a createItem-event.
    service.createItem(item)
    res.sendStatus(201)
  } else {
    res.sendStatus(400)
  }
})*/

// PUT /items - Update an item
/*usersRouter.put('/items/:itemId', passport.authenticate('jwt', { session: false }), itemValidateMW, (req, res) => {
  userId = req.signedCookies['userId']

  if (userId) {
    const item = {
      title: req.body.title,
      description: req.body.description,
      category: req.body.category,
      askingPrice: req.body.askingPrice,
      dateOfPosting: req.body.dateOfPosting,
      deliveryType: req.body.deliveryType,
      sellerId: userId,
      city: req.body.city,
      county: req.body.county,
      country: req.body.country,
    }

    // Emit a createItem-event.
    service.createItem(item)
    res.sendStatus(201)
  } else {
    res.sendStatus(400)
  }
})*/


// Export the router.
module.exports = usersRouter