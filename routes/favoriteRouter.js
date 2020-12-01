const express = require("express");
const bodyParser = require("body-parser");
const Favorites = require("../models/favorite");
const favoriteRouter = express.Router();
const verifyUser = require("../authenticate").verifyUser;
const authenticate = require('../authenticate')

const cors = require('./cors');
favoriteRouter.use(bodyParser.json());

favoriteRouter
  .route("/")
  .options(cors.corsWithOptions, (req, res) => {res.sendStatus(200)})
  .get(cors.cors, authenticate.verifyUser, (req, res, next) => {
    Favorites.find({ user: req.user._id })
      .populate("dishes")
      .populate("user")
      .then(favorites => {
        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json");
        res.json(favorites);
        err => next(err);
      })
      .catch(err => next(err));
  })

  .post(cors.corsWithOptions, authenticate.verifyUser, (req, res, next) => {
    let newDishes = req.body.map(elem => elem._id); // convert array of objs to array of values.
    Favorites.findOne({ user: req.user._id })
      .then(
        favorite => {
          if (!favorite) {
            // Favorites.create({ user: req.user._id })
            //   .then(favorite => {
            //     console.log("New Favorite created ");
            //     let oldDishes = [];
            //     let dishes = concatDishes(newDishes, oldDishes);
            //     favorite.dishes = dishes;
            //     favorite.save().then(favorite => {
            //         console.log("Dish added to favorites dishes");
            //         res.statusCode = 200;
            //       res.setHeader("Content-Type", "application/json");
            //       res.json(favorite);
            //     });
            //   })
            //   .catch(err => next(err));
            favorite.save()
            .then((favorite) => {
                Favorites.findById(favorite._id)
                .populate('user')
                .populate('dishes')
                .then((favorite) => {
                    res.statusCode = 200;
                    res.setHeader('Content-Type', 'application/json');
                    res.json(favorite);
                })
            })
            .catch((err) => {
                return next(err);
            });
          } 
          else {
            let oldDishes = favorite.dishes.map(elem => elem.toString());
            let dishes = concatDishes(newDishes, oldDishes);
            favorite.dishes = dishes;
            favorite.save().then(favorite => {
                console.log("Dish added to favorites dishes");
                res.statusCode = 200;
              res.setHeader("Content-Type", "application/json");
              res.json(favorite);
            });
          }
        },
        err => next(err)
      )
      .catch(err => next(err));
  })
  
  .put(cors.corsWithOptions,authenticate.verifyUser, (req, res, next) => {
    res.statusCode = 403;
    res.end("PUT operation not supported on /favorites");
  })
  .delete(authenticate.verifyUser, (req, res, next) => {
    Favorites.deleteOne({ user: req.user._id })
      .then(
        resp => {
          res.statusCode = 200;
          res.setHeader("Content-Type", "application/json");
          res.json(resp);
        },
        err => next(err)
      )
      .catch(err => next(err));
  });

favoriteRouter
  .route("/:dishId")
  .options(cors.corsWithOptions, (req, res) => { res.sendStatus(200); })
  .get(cors.cors, authenticate.verifyUser, (req,res,next) => {
    Favorites.findOne({user: req.user._id})
    .then((favorites) => {
        if (!favorites) {
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            return res.json({"exists": false, "favorites": favorites});
        }
        else {
            if (favorites.dishes.indexOf(req.params.dishId) < 0) {
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                return res.json({"exists": false, "favorites": favorites});
            }
            else {
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                return res.json({"exists": true, "favorites": favorites});
            }
        }

    }, (err) => next(err))
    .catch((err) => next(err))
})
  
  .post(cors.corsWithOptions,authenticate.verifyUser, (req, res, next) => {
    let newDishes = [req.params.dishId];
    Favorites.findOne({ user: req.user._id })
      .then(
        favorite => {
          if (!favorite) {
            Favorites.create({ user: req.user._id })
              .then(favorite => {
                console.log("New Favorite created successfully! ");
                let oldDishes = [];
                let dishes = concatDishes(newDishes, oldDishes);
                favorite.dishes = dishes;
                favorite.save().then(favorite => {
                  console.log("Dish added to favorites dishes");
                  res.statusCode = 200;
                  res.setHeader("Content-Type", "application/json");
                  res.json(favorite);
                });
              })
              .catch(err => next(err));
          } else {
            let oldDishes = favorite.dishes.map(elem => elem.toString());
            let dishes = concatDishes(newDishes, oldDishes);
            favorite.dishes = dishes;
            favorite.save().then(favorite => {
                console.log("Dish added to favorites dishes");
                res.statusCode = 200;
              res.setHeader("Content-Type", "application/json");
              res.json(favorite);
            });
          }
        },
        err => next(err)
      )
      .catch(err => next(err));
  })
  .put(cors.corsWithOptions,authenticate.verifyUser, (req, res, next) => {
    res.statusCode = 403;
    res.end("PUT operation not supported on /favorites/:dishId");
  })
  .delete(cors.corsWithOptions,authenticate.verifyUser, (req, res, next) => {
    Favorites.findOne({ user: req.user._id })
      .then(
        favorite => {
          if (favorite) {
            let oldDishes = favorite.dishes.map(elem => elem.toString()); //ObjectId to String
            let dishes = new Set(oldDishes); // array to set
            let dishId = req.params.dishId;
            if (!dishes.has(dishId)) {
              err = new Error(`Dish  ${dishId}  not found in favorites`);
              err.status = 404;
              return next(err);
            } else {
              dishes.delete(dishId);
              dishes = [...dishes]; // convert set to array
              favorite.dishes = dishes;
              favorite.save().then(favorite => {
                console.log(`dish ${dishId} deleted from favorites`);
                res.statusCode = 200;
                res.setHeader("Content-Type", "application/json");
                res.json(favorite);
              });
            }
          } else {
            err = new Error(`Favorites for user  ${req.user._id}  does not exist`);
            err.status = 404;
            return next(err);
          }
        },
        err => next(err)
      )
      .catch(err => next(err));
  });

//this function concatenates two arrays 

function concatDishes(newDishes, oldDishes) {
  let dishes = newDishes.concat(oldDishes);
  dishes = new Set(dishes);
  console.log("Set(dishes)", dishes);
  dishes = [...dishes];
  return dishes;
}

module.exports = favoriteRouter;
