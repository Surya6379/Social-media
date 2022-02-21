require('dotenv').config()
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require('mongoose');
const session = require('express-session')
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate')



const app = express();

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

app.use(session(
{
    secret: 'Dont disclose secrerts to anyone',
    resave: false,
    saveUninitialized: false,
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/socialDB");

const userSchema = new mongoose.Schema(
    {
        email : String,
        password : String,
        googleId : String,
        secret: String

});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

// userSchema.plugin(encrypt,{secret:process.env.SECRET,encryptedFields:["password"]});

const User = mongoose.model("User",userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
    done(null, user.id);
  });
  
  passport.deserializeUser(function(id, done) {
    User.findById(id, function(err, user) {
      done(err, user);
    });
  });

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/home"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));


app.get("/",function(req,res)
{
    res.render("login");
});

app.get("/auth/google",passport.authenticate("google", { scope: ["profile"] }));

app.get("/auth/google/home", 
  passport.authenticate('google', { failureRedirect: '/' }),
  function(req, res) {
    // Successful authentication, redirect secrets.
    res.redirect("/home");
  });






app.get("/register",function(req,res)
{
    res.render("register");
});

app.get("/home",function(req,res)
{ 
    if(req.isAuthenticated())
    {
        console.log("In home page");
        res.render("home");
    }
    else
        res.redirect("/");
    

});


app.post("/register",function(req,res)
{
    console.log(req.body.username)
    console.log(req.body.password)
    User.register({username:req.body.username},req.body.password,function(err,user)
    {
        
        if(err)
        {
            console.log(err);
            res.redirect("/register");
        }
        else
        {
            passport.authenticate("local")(req,res,function()
            {
                res.redirect("/home");   
            });
        }
    });

});

app.post("/",function(req,res)
{
    console.log("post login")
    const user = new User(
    {
        username : req.body.username,
        password : req.body.password
    });

    console.log("post login")

    req.login(user,function(err)
    {
        if(err)
            console.log(err);
        else
        {
            passport.authenticate("local")(req,res,function()
            {
                res.redirect("/home");   
            });
        }
    });

});

app.post("/submit",function(req,res)
{
    const userSecret = req.body.secret;
    const userID = req.user.id;
    User.findById(userID,function(err,objs)
    {
        if(err)
            console.log(err);
        else
        {
            if(objs)
            {
                objs.secret = userSecret;
                objs.save(function(){
                    res.redirect("/home");
                })
            }
        }
    });
});
app.listen(3000, function() {
  console.log("Server started on port 3000");
});