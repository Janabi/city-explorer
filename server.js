'use strict';
//... application dependiences 
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const superagent = require('superagent');
const pg = require('pg');
///.. application setup 
const server = express();
server.use(cors());
const client = new pg.Client(process.env.DATABASE_URL);
const PORT = process.env.PORT || 3000;
//.. Routes ! 
server.get('/location', handlerLocation);
server.get('/weather', handlerWeather);
server.get('/trails', handlerHiking);
server.get('/movies', movieHandler);
server.get('/yelp', yelpHandler);
server.use(errorHandler);

// Request URL: http://localhost:3050/yelp?search_query=seattle&formatted_query=Seattle%2C%20King%20County%2C%20Washington%2C%20USA&latitude=47.6038321&longitude=-122.3300624&page=1
function yelpHandler(request, response) {
    let city = request.query.search_query;
    let page = request.query.page;
    let offset = ((page -1) * 5 + 1);
    let key = process.env.YELP_API_KEY;
    let url = `https://api.yelp.com/v3/businesses/search?location=${city}&limit=5&offset=${offset}`;

    superagent.get(url)
    .set({'Authorization': 'Bearer ' + key})
    .then(data => {
        let yelpData = data.body.businesses.map(value => {
            return new Yelp(value);
        })
        response.send(yelpData);
    })
    .catch(()=> {
        errorHandler("yelp is not working", request, response);
    });
}

//https://city-explorer-backend.herokuapp.com/movies?id=430&search_query=lynnwood&formatted_query=Lynnwood%2C%20WA%2C%20USA&latitude=47.820930&longitude=-122.315131&created_at=&page=1
function movieHandler (request, response) {
    let region = request.query.search_query;
    let key = process.env.MOVIE_API_KEY;
    let url = `https://api.themoviedb.org/3/search/movie?api_key=${key}&query=${region}`;

    superagent.get(url)
    .then(data=> {
        let movieArray = data.body.results.map(movie => {
            return new Movie(movie);
        })
        response.status(200).json(movieArray);
    })
    .catch(() => {
        errorHandler("the moviedb is not working", request, response);
    })
}

//..https://city-explorer-backend.herokuapp.com/location?city=amman 
function handlerLocation(request, response) {
    // const locationData = require('./data/location.json');
    let cityName = request.query.city;
    let locationKey = process.env.GEOCODE_API_KEY;
    let url = `https://eu1.locationiq.com/v1/search.php?key=${locationKey}&q=${cityName}&format=json`
    getLocation(cityName).then(data=> {
        if (data.length === 0) {
            superagent.get(url)
            .then(data => {
                // console.log(data.body)
                let locationObj = new Location(cityName, data.body);
                response.send(locationObj);
                let safeValues = [
                    locationObj.search_query,
                    locationObj.formatted_query,
                    locationObj.latitude,
                    locationObj.longitude
                ];
                let SQL = `INSERT INTO locations VALUES ($1,$2,$3,$4);`;
                client.query(SQL, safeValues)
                .then(result =>{
                    console.log("The data were added successfully!!");
                })
                .catch(error =>{
                    response.send(errorHandler(error, request, response));
                })
            })
            .catch(() => {
                errorHandler('The Location Data is Not Found !', request, response)
            })
        } else {
            response.status(200).send(data[0]);
        }
    });
    
     
}

function getLocation (city) {
    let safeValue = [city];
    let SQL = `SELECT * FROM locations WHERE search_query = $1`;
    return client.query(SQL, safeValue)
    .then(result=>{
        return result.rows;
    });
}



//.. https://city-explorer-backend.herokuapp.com/weather?id=700&search_query=amman&formatted_query=Amman%2C%2011181%2C%20Jordan&latitude=31.951569&longitude=35.923963&created_at=&page=1
function handlerWeather(request, response) {
    // const weatherData = require('./data/weather.json');
    let latitudeWeather = request.query.latitude;
    let longitudeWeather = request.query.longitude;
    let weatherKey = process.env.WEATHER_API_KEY;
    let cityWeather = request.query.search_query;
    let urlWeather = `https://api.weatherbit.io/v2.0/forecast/daily?city=${cityWeather}&key=${weatherKey}&days=5&lat=${latitudeWeather}&lon=${longitudeWeather}`;
    superagent.get(urlWeather)
        .then(wData => {
            // console.log(wData.body.data);
            let weatherList = wData.body.data.map(value => {
                let desc = value.weather.description
                let time = value.datetime
                let weatherData = new Weather(desc, time);
                return weatherData;
            });
            response.status(200).send(weatherList);
            // console.log(data);
        })
        .catch(() => {
            errorHandler('The Weather Data is Not Found !', request, response)
        })
};
//..https://www.hikingproject.com/data/get-trails?lat=40.0274&lon=-105.2519&maxDistance=10&key=200980365-6f8c863
function handlerHiking(request, response) {
    let latTrail = request.query.latitude;
    let lonTrail = request.query.longitude;
    let keyTrail = process.env.TRIAL_API_KEY;
    let urlTrail = `https://www.hikingproject.com/data/get-trails?lat=${latTrail}&lon=${lonTrail}&maxDistance=10&key=${keyTrail}`
    superagent.get(urlTrail)
        .then(data => {
            console.log(data.body.trails)
            let trailData = data.body.trails.map(value => {
                let trailObj = new Trails(value)
                return trailObj
            })
            response.status(200).send(trailData);
        })
        .catch(() => {
            errorHandler('The Trails Data is Not Found !', request, response)
        })
}
//.. https://city-explorer-backend.herokuapp.com/trails?id=700&search_query=amman&formatted_query=Amman%2C%2011181%2C%20Jordan&latitude=31.951569&longitude=35.923963&created_at=&page=1
// constructer for location 
function Location(city, locData) {
    this.search_query = city;
    this.formatted_query = locData[0].display_name;
    this.latitude = locData[0].lat;
    this.longitude = locData[0].lon;
};
// constructer for weather 
function Weather(desc, time, cityWeather) {
    this.forecast = desc;
    this.time = time;
    this.search_query = cityWeather;
};
//.. constructer for Trails 
function Trails(value) {
    this.name = value.name;
    this.location = value.location;
    this.length = value.length;
    this.stars = value.stars;
    this.star_votes = value.starVotes;
    this.summary = value.summary;
    this.trail_url = value.url
    this.conditions = value.conditionDetails
    this.condition_date = value.conditionDate.slice(0, value.conditionDate.indexOf(' ') + 1);
    this.condition_time = value.conditionDate.slice(value.conditionDate.indexOf(' ') + 1, value.conditionDate.length);
}
//.. constructor for Movie
// https://image.tmdb.org/t/p/w500
//https://api.themoviedb.org/3/movie/550?api_key=&region=Lynnwood
function Movie(value) {
    this.title = value.original_title;
    this.overview = value.overview;
    this.average_votes = value.vote_average;
    this.total_votes = value.vote_count;
    this.image_url = 'https://image.tmdb.org/t/p/w500' + value.poster_path;
    this.popularity = value.popularity;
    this.released_on = value.release_date;
}

//.. constructor for Yelp
function Yelp(value) {
    this.name = value.name;
    this.image_url = value.image_url;
    this.price = value.price;
    this.rating = value.rating;
    this.url = value.url;
}
server.get('/', (req, res) => {
    res.status(200).send('hello hello');
})

client.connect()
.then(()=>{
    server.listen(PORT, () => {
        console.log('hi');
    });
});

server.get('*', (request, response) => {
    response.status(404).send('not found');
})
function errorHandler(error, request, response) {
    response.status(500).send(error);
}