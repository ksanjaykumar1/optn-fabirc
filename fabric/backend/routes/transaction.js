const express = require('express')
const router = express.Router()
const {submitTransaction} = require('../controller/transaction')

router.post('/',submitTransaction)

module.exports= router