//imports
const express = require('express');
const app = express();
const path = require('path');
const testRoute = require('./routes/testRoute.js');
const zapRoute = require('./routes/zapRoute.js');
//
// variaveis
const port =  process.env.PORT || 8000;
//
//middleware
app.use(express.json())
app.use(express.urlencoded({extended : false}))
app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, 'view'))
//
// rotas
app.use('/qr', zapRoute);
//
app.use('/test', testRoute);
// server listen
app.listen(port, () => {
  console.log(`app listening at http://localhost:${port}`)
})
//
