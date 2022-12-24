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

const indexRouter = require('../route/route')
app.use('/', indexRouter)

const streamURL = process.env.STREAM_URL
const rulesURL = process.env.RULES_URL
const token = process.env.BEARER_TOKEN
const rules = [{ value: 'from:DouglasMeurer4'}]

async function setRules() {
    const data = {
        add: rules,
      }
    
      const response = await needle('post', rulesURL, data, {
        headers: {
          'content-type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      })
    
      return response.body
}


async function getRules() {
    const response = await needle('get', rulesURL, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    return response.body
  }


function getTweets(socket) {

    const streamTweets = needle.get(streamURL, {
        headers: {
            Authorization: `Bearer ${token}`
        }
    })

    streamTweets.on('data', (data) => {
        try {
            const json = JSON.parse(data) 
            console.log(json)
            socket.emit('tweet', json)
        } catch (error) {}
    })
}


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

    getTweets(io)
})


app.listen(Number(process.env.PORT), () => {
    console.log("Server up and running on:", process.env.PORT)
})
