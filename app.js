var express = require('express');
var bodyParser = require('body-parser');
var shortid = require('shortid');
var mongoose = require('mongoose');
var regex1 = /^\d+/;
var regex2 = /^([0-9][0-9][0-9][0-9])[-](0[1-9]|1[0-2])[-](0[1-9]|[12][0-9]|3[01])$/;
var app = express();

app.use(express.static('./assets'));

mongoose.Promise = global.Promise;
mongoose.connect('mongodb://testing123:testing123@ds139722.mlab.com:39722/exercise-tracker', { useNewUrlParser: true }).then(
    ()=>{
        console.log("connected to mongoDB")
    },
    (err)=>{
        console.log("err", err);
    }
);//connect to the database

var exerciseSchema = new mongoose.Schema({
    description: String,
    duration: Number,
    date: String
});//create the exercise schema
var userSchema = new mongoose.Schema({
    username: String,
    _id: {
        type: String,
        default: shortid.generate
    },
    exercises: [exerciseSchema]
});//create the user schema with the exercise schema nested inside
var User = mongoose.model("User", userSchema);//create the user model

app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/views/index.html');
});

app.post('/exercise/new-user', function(req, res) {
    var username = req.body.username;
    if(username) {
        User.find({username: username}, function(err, result) {//check if the username is available
            if(err) {
                throw err;
            }else {
                if(result.length) {//if the username is taken show the error
                    res.json({err: 'username not available'});
                }else {//otherwise create a new user
                    var newUser = new User({username: username}).save(function(err, data) {
                        if(err) throw err;
                        res.json({username: data.username, id: data._id});
                    });
                }
            }
        });
    }else {
        res.json({err: "username can't be blank"});
    }
});

app.post('/exercise/add', function(req, res) {
    var userId = req.body.userId;
    var description = req.body.description;
    var duration = req.body.duration;
    var date = req.body.date;
    if(userId && description && duration && regex1.test(duration) && date && regex2.test(date)) {//ensure all fields are filled, the duration is only numbers and the date format is correct
        User.find({_id: userId}, function(err, result) {//find a user by the userId
            if(err) {
                throw err;
            }else {
                if(result.length) {//if the user exists add the exercise
                    User.find({_id: userId}).update({$push: {exercises: {description: description, duration: duration, date: date}}}).then(function() {
                        User.find({_id: userId}, function(err, result) {
                            if(err) throw err;
                            res.json({username: result[0].username, id: result[0]._id, exercises: result[0].exercises});
                        });
                    });
                }else {//otherwise show the error
                    res.json({err: 'user does not exist'});
                }
            }
        });
    }else {
        res.json({error: "Ensure all fields have been filled, the duration is a number and the date format is correct."});
    }
});

app.get('/exercise/user/:id', function(req, res) {
    User.find({_id: req.params.id}, function(err, result) {//check if the id matches a user
        if(err) {
            throw err;
        }else {
            if(result.length) {//if it matches show that user's exercises
            res.json({exercises: result[0].exercises});
        }else {//otherwise, show the error
            res.json({error: 'user does not exist'});
        }
        }
    });
});

app.listen(3000);//listen to port
