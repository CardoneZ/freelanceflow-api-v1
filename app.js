require('dotenv').config();
const Server = require('./Settings/server');  

const server = new Server();
server.listen();
