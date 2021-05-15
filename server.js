const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const mongoose = require('mongoose')
const {Schema, model} = require('mongoose')
const bodyParser = require('body-parser')
const moment = require('moment')

//Connecting to database
mongoose.connect(process.env.MONGO_URI,{
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useFindAndModify: false
}).then(() => console.log("Database Connected"))
  .catch((err) => console.log(err))

//User Schema
const userSchema = Schema({
  username: {type:String, require: true},
  count: {type: Number, default: 0},
  log: [{
    type: Schema.Types.ObjectId,
    ref: "Exercises"
  }]
}, {versionKey: false})

const exerciseSchema = Schema({
  description: String,
  duration: Number,
  date: Date,
  user: {
    type: Schema.Types.ObjectId,
    ref: "User"
  }
}, {versionKey: false})

const Exercises = model("Exercises", exerciseSchema)
const User = model("User", userSchema)

//
app.use(cors())
//parser req to json
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())
app.use(express.json({strict: true}))

app.use(express.static('public'))

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.get('/api/users', async (req, res)=> {
  const users = await User.find({})
  newUsers = users.map(user => ({_id: user._id, username: user.username}))

  res.json(newUsers)
})

app.post('/api/users', async (req, res) => {
  const {username} = req.body

  try{
    const findUser = await User.findOne({
      username: username
    })

    if(findUser){
      res.send("Username already taken").end()
    }

    const user = new User({
      username
    })

    const savedUser = await user.save()
    console.log(savedUser)
    res.status(201).json({
      _id: user._id,
      username,
    })
    
  }catch(err){
    console.log(err)
  }
})

app.get("/api/users/:id/logs", async (req, res) => {
  const {id} = req.params
  let {"from": dateFrom, to: dateTo, limit} = req.query

  try{
    let user = await User.findById(id).populate("log", {
      _id: 0
    })
    const length = user.log.lengt

    if(dateFrom && dateTo && limit >= 0){
      dateFrom = new Date(dateFrom).toUTCString()
      dateTo = new Date(dateTo).toUTCString()

      user.log = user.log.filter(u => {
        const date = new Date(u.date).toDateString()
        return date >= dateFrom && date <= dateTo
      })
    }

    user.log = user.log.slice(0, limit)
    
    res.json(user).end()

  }catch(err){
    console.log(err)
  }
})

app.post('/api/users/:_id/exercises', async (req, res) => {
  let {
    description,
    duration,
    date
  } = req.body

  const {_id: id} = req.params

  date = date
        ? new Date(date).toDateString() 
        : new Date(Date.now()).toDateString();

  try{
    const user = await User.findById(id)

    if(!user) return res.send("Unknown userId")

    const exercise = new Exercises({
      date,
      duration,
      description,
    })

    const exerciseSaved = await exercise.save()

    user.log = [...user.log, exerciseSaved._id]
    user.count = user.count + 1

    await user.save()
    res.json({
      _id: id,
      username: user.username,
      date: date,
      duration: Number(duration),
      description,
    })
  }catch(err){
    console.log(err)
  }
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
