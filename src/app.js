const express = require('express');
const bodyParser = require('body-parser');
const { sequelize } = require('./model');
const { getProfile } = require('./middleware/getProfile');
const contractsController = require('./controllers/contracts.controller');
const jobsController = require('./controllers/jobs.controller');

const app = express();

app.use(bodyParser.json());
app.set('sequelize', sequelize);
app.set('models', sequelize.models);

// routes
app.use('/contracts', getProfile, contractsController);
app.use('/jobs', getProfile, jobsController);

module.exports = app;
