const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
    console.log('teste')
  res.send('iha')
})
router.post('/', (req, res) => {
  //axios enviando
  res.send(req.body.data);
})

module.exports = router;