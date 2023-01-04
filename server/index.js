const express = require('express')
const http = require('http')
const needle = require('needle')
const socketIo = require('socket.io')
require('dotenv').config()
const cors = require('cors')
const app = express()
const server = http.createServer(app)
const io = socketIo(server)

app.use(express.json())
app.use(cors({ origin: process.env.REACT_APP_URI }))


// create a client route to access API
const indexRouter = require('../route/route')
app.use('/', indexRouter)

// instanciate variables to be used 
const streamURL = process.env.STREAM_URL
const rulesURL = process.env.RULES_URL
const token = process.env.BEARER_TOKEN
// const rules would be included in a user schema so value could be set on the client side 
const rules = [{ value: 'from:DouglasMeurer4'}]

// functions to post filter to Twitter's API endpoint
async function setRules() {

  // rules = the value to be used as filter to API endpoint
    const data = {
        add: rules,
      }
    
      // a call to Twitter's filter API endpoint passing the value to be returned as a promise 
      const response = await needle('post', rulesURL, data, {

        // passing to API the credentials to access filter endpoint
        headers: {
          'content-type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      })
    
      // loads the filter endpoint and returns confirmation
      return response.body
}

// function to access the Filtered API's endpoint by value set in the above function
async function getRules() {
    const response = await needle('get', rulesURL, {
      
      // Passing the credentials so twitters API knows what filtered information to return
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    // returns promise
    return response.body
  }

// stream tweets through a socket (open connection)
function getTweets(socket) {

    // get access to stream API endpoint 
    const streamTweets = needle.get(streamURL, {
        headers: {
            Authorization: `Bearer ${token}`
        }
    })

    // initialize stream 
    streamTweets.on('data', (data) => {
        try {
            const json = JSON.parse(data) // data is a buffer - so we parse to json
            socket.emit('tweet', json) // sends to client realtime tweets
        } catch (error) {}
    })
}

// when client connects it starts streaming 
io.on('Connection', async () => {
    console.log('Connected')

    let currentRules

    try {
        currentRules = await getRules()
        await setRules()
    } catch (error) {
        console.log(error)
        process.exit(1)
    }

    // pass open connection to tweets stream API
    getTweets(io)
})


app.listen(Number(process.env.PORT), () => {
    console.log("Server up and running on:", process.env.PORT)
})
