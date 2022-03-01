const express = require('express')
const itemsRouter = express.Router()
const service = require('../sharedService')
const { v4: uuidv4 } = require('uuid')

// JWT signature key
//const secrets = require('../secrets.json')
//const secret = secrets.jwtSignKey
const secret = process.env.jwtSignKey

// items - Array for storing information about the items. 
// It's been populated by some example items.
let items = [
  {
    id: uuidv4(),
    title: "Asus Geforce Rtx 3070 8gb oc",
    description: "Takuu voimassa 05/24. Ei lhr malli.",
    category: "Näytönohjaimet",
    askingPrice: 1000.00,
    // TODO: Ota aika Date-oliosta
    dateOfPosting: "2022-02-26",
    deliveryType: "Pickup",
    sellerId: "",
    city: "Oulu",
    county: "Pohjois-Pohjanmaa",
    country: "Finland",
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
itemsRouter.use(cookieParser(secret));

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
jwtValidationOptions.secretOrKey = secret

passport.use(new JwtStrategy(jwtValidationOptions, function (jwt_payload, done) {
  const user = users.find(u => u.id === jwt_payload.userId)
  done(null, user)
}))

// Multer Cloudinary
const cloudinary = require('cloudinary')
const { CloudinaryStorage } = require('multer-storage-cloudinary')
const multer = require('multer')

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  folder: '',
  allowedFormats: ['jpg', 'png']
})

const parser = multer({ storage: storage })

// GET /search - Search Items
itemsRouter.get('/search', (req, res) => {
  const category = req.query.category
  const city = req.query.city
  const county = req.query.county
  const country = req.query.country
  const date = req.query.date

  let filteredItems = items

  if (category) {
    filteredItems = filteredItems.filter(item => item.category === category)
  }

  if (city) {
    filteredItems = filteredItems.filter(item => item.city === city)
  }

  if (county) {
    filteredItems = filteredItems.filter(item => item.county === county)
  }

  if (country) {
    filteredItems = filteredItems.filter(item => item.country === country)
  }

  if (date) {
    filteredItems = filteredItems.filter(item => item.dateOfPosting === date)
  }

  if (filteredItems === []) {
    res.sendStatus(204)
  } else {
    res.json(filteredItems)
  }
})

// GET / - Get All Item Info
itemsRouter.get('/', (req, res) => {
  res.json(items)
})

itemsRouter.post('/images', parser.single('image'), (req, res) => {
  console.log(req.file)
  res.send("moi")
  res.json(req.file)
})

// GET /:itemId - Get Item Info by Item ID
itemsRouter.get('/:itemId', (req, res) => {
  const id = req.params.itemId
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
  const itemId = req.params.itemId
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
  const itemId = req.params.itemId

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

  if (userId) {
    items.push({
      id: uuidv4(),
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

// Export the router.
module.exports = itemsRouter