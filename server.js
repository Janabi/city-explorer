'use strict';

require('dotenv').config();
const express = require('express');
const server = express();

const cors = require('cors');

server.use(cors());

const PORT = process.env.PORT || 3000;

server.get('/location', (request, response) => {
    const locationData = require('./data/location.json');

    let locationObj = new Location('Lynnwood', locationData);
    response.send(locationObj);
});

server.get('/weather', (request, response) => {
    const weatherData = require('./data/weather.json');

    let weatherList = [];
    weatherData.data.forEach(value => {
        let desc = value.weather.description;
        let date = value.valid_date;
        let weatherObj = new Weather(desc, date);
        weatherList.push(weatherObj);
    })
    response.send(weatherList);

});

function Location(city, locData) {
    this.search_query = city;
    this.formatted_query = locData[0].display_name;
    this.latitude = locData[0].lat;
    this.longitude = locData[0].lon;
};


function Weather(desc, date) {
    this.forecast = desc;
    this.time = date;

};

server.get('/', (req, res) => {
    res.status(200).send('hello hello');
});
server.listen(PORT, () => {
    console.log('hi');
});

server.get('*', (request, response) => {
    response.status(404).send('not found');
});

server.use((error, request, response) => {
    response.status(500).send(error);
});