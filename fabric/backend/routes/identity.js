const express = require('express')
const router = express.Router()
const {
    registerUser,
    enrollUser, 
    generateAdminWallet,
    reEnrollUser
} = require('../controller/identity')

router.get('/generateAdminWallet',generateAdminWallet)
router.post('/registerUser',registerUser)
router.post('/enrollUser',enrollUser)
router.post('/reEnrollUser',reEnrollUser)

module.exports=router