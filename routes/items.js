const express = require('express')
const itemsRouter = express.Router()
//const secrets = require('../secrets.json')
const service = require('../sharedService')

// items - Array for storing information about the items. 
// It's been populated by some example items.
let items = [
  {
    id: 1,
    title : "Asus Geforce Rtx 3070 8gb oc",
    description : "Takuu voimassa 05/24. Ei lhr malli.",
    category : "Näytönohjaimet",
    askingPrice : 1000.00,
    // TODO: Ota aika Date-oliosta
    dateOfPosting : "2022-02-26",
    deliveryType : "Pickup",
    sellerId : "",
    city : "Oulu",
    county : "Pohjois-Pohjanmaa",
    country : "Finland",
  }
]

// JSON body-parser middleware. Express 4.16+ has it's own body-parser
// so no third party package is needed.
itemsRouter.use(express.json());

// Ajv - JSON schema validator releated
const Ajv = require('ajv')
const ajv = new Ajv()

const itemSchema = require('../schemas/item.schema.json')
const itemValidator = ajv.compile(itemSchema)

// Cookie parser
const cookieParser = require('cookie-parser')
itemsRouter.use(cookieParser(process.env.jwtSignKey));

// itemValidateMW - Is used to validate the item information.
const itemValidateMW = (req, res, next) => {
  const validationResult = itemValidator(req.body)
  if (validationResult == true) {
    next()
  } else {
    res.sendStatus(400)
  }
}

// Passport - JSON Web Token authentication related
const passport = require('passport')
const JwtStrategy = require('passport-jwt').Strategy
const ExtractJwt = require('passport-jwt').ExtractJwt

let jwtValidationOptions = {}
jwtValidationOptions.jwtFromRequest = ExtractJwt.fromAuthHeaderAsBearerToken()
jwtValidationOptions.secretOrKey = process.env.jwtSignKey

passport.use(new JwtStrategy(jwtValidationOptions, function (jwt_payload, done) {
  const user = users.find(u => u.id === jwt_payload.userId)
  done(null, user)
}))

// GET / - Get All Item Info
itemsRouter.get('/', (req, res) => {
  res.json(items)
})

// GET /:itemId - Get Item Info by Item ID
itemsRouter.get('/:itemId', (req, res) => {
  const id = parseInt(req.params.itemId)
  const item = items.find(item => item.id === id)

  if (item) {
    res.json(item)
    res.sendStatus(200)
  } else {
    res.sendStatus(404)
  }
})

// DELETE /:itemId - Delete Item Info by Item ID. User's JSON Web Token needed. Cookie with signed userID needed.
itemsRouter.delete('/:itemId', passport.authenticate('jwt', { session: false }), (req, res) => {
  const userId = req.signedCookies['userId']
  const itemId = parseInt(req.params.itemId)
  const item = items.find(item => item.id === itemId)

  if (item && item.sellerId === userId) {
    items = items.filter(item => item.id !== itemId)

    // Emit a removeItem-event.
    service.removeItem(userId, itemId)
    res.sendStatus(202)
  } else {
    res.sendStatus(404)
  }
})

// PUT /:itemId - Update Item Info by Item ID. JSON Web Token needed. Cookie with signed userID needed.
itemsRouter.put('/:itemId', passport.authenticate('jwt', { session: false }), itemValidateMW, (req, res) => {
  const userId = req.signedCookies['userId']
  const itemId = parseInt(req.params.itemId)

  let item = items.find(item => item.id === itemId)

  if (item && item.sellerId === userId) {
    item.title = req.body.title
    item.description = req.body.description
    item.category = req.body.category
    item.askingPrice = req.body.askingPrice
    item.dateOfPosting = req.body.dateOfPosting
    item.deliveryType = req.body.deliveryType
    item.sellerId = userId
    item.city = req.body.city
    item.county = req.body.county
    item.country = req.body.country
    res.sendStatus(202)
    res.end()
  } else {
    res.sendStatus(404)
    res.end()
  }
})

// POST /items - Create a New item. JSON Web Token needed. Cookie with signed userID needed.
itemsRouter.post('/', passport.authenticate('jwt', { session: false }), itemValidateMW, (req, res) => {
  const userId = req.signedCookies['userId']
  const itemId = items.length + 1

  if (userId) {
    items.push({
      id: itemId,
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
    })

    // Emit an addItem-event.
    service.addItem(userId, itemId)
    res.sendStatus(201)
  } else {
    res.sendStatus(400)
  }
})

itemsRouter.get('/search', (req, res) => {
  res.json(items)
})

// Export the router.
module.exports = itemsRouter