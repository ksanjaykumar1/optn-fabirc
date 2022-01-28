const express = require('express');
const app = express();

const identity = require('./routes/identity')
const transaction = require('./routes/transaction')

const port = process.env.PORT || 3000

app.use(express.json({ extended: false }))

app.get('/', (req, res) => {
    res.send('Hello World!')
  })

app.use('/api/v1/identity', identity)
app.use('/api/v1/transaction', transaction)

app.listen(port,()=>{
    console.log(`The server is listening on port ${port}...`)
})