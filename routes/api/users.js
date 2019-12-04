const mongoose = require("mongoose");
const router = require("express").Router();
const passport = require("passport");
const auth = require("../auth");
const userController = require("../../controllers/userController");
const User = mongoose.model("User");
const { isValid } = require("../../utils");

//get current user
router.get(
  "/",
  auth.required,
  userController.getUser,
  userController.grantAccess("readOwn"),
  (req, res, next) => {
    return res.json({
      payload: req.payload,
      user: req.user
    });
  }
);

//get all users
router.get(
  "/all?/",
  auth.required,
  userController.getUser,
  userController.grantAccess("readAny"),
  (req, res, next) => {
    let limit = parseInt(req.query.limit) || 50;
    if (limit > 200) {
      limit = 200;
    }
    let page = parseInt(req.query.page) || 1;
    const offset = (page - 1) * limit;
    const queries = [];

    User.aggregate(
      [
        {
          $match: {
            // $or: queries
          }
        },
        // { $sort: {} },
        {
          $facet: {
            metadata: [{ $count: "total" }, { $addFields: { page: page } }],
            data: [{ $skip: offset }, { $limit: limit }]
          }
        }
      ],
      (err, docs) => {
        // console.log("Result:", docs);
        // return;
        if (!docs[0] || !docs[0].metadata[0]) {
          console.log(docs[0].metadata);
          return res.status(204).json({
            error: "No content"
          });
        }

        const pages = Math.ceil(docs[0].metadata[0].total / limit) || 1;

        if (page > pages) {
          page = pages;
        }

        return res.status(200).json({
          metadata: {
            page: page,
            pages: pages
          },
          users: docs[0].data
        });
      }
    );

    // User.count()
    //   .then(count => {
    //     const pages = parseInt(count / limit) || 1;
    //     if (page > pages) {
    //       page = pages;
    //     }
    //     const offset = (page - 1) * limit;

    //     User.find({})
    //       .skip(offset)
    //       .limit(limit)
    //       .then(users => {
    //         return res.json({
    //           users: users,
    //           page: page,
    //           pages: pages
    //         });
    //       })
    //       .catch(next);
    //   })
    //   .catch(next);
  }
);

//update user
router.put("/", auth.required, (req, res, next) => {
  User.findById(req.payload.id)
    .then(function(user) {
      if (!user) {
        return res.sendStatus(401);
      }

      if (isValid(username)) {
        user.username = req.body.user.username;
      }
      if (isValid(email)) {
        user.email = req.body.user.email;
      }
      if (isValid(bio)) {
        user.bio = req.body.user.bio;
      }
      if (isValid(image)) {
        user.image = req.body.user.image;
      }
      if (isValid(oldPassword) && isValid(newPassword)) {
        if (!req.body.user.oldPassword || !req.body.user.newPassword) {
          return res
            .status(422)
            .json({ errors: { password: "can't be blank" } });
        }
        if (!user.validPassword(req.body.user.oldPassword)) {
          return res.status(422).json({ errors: { password: "mismatch" } });
        }
        user.setPassword(req.body.user.newPassword);
      }

      return user.save().then(() => {
        return res.json({ user: user.toAuthJSON() });
      });
    })
    .catch(next);
});

router.post("/login", (req, res, next) => {
  //login

  if (!req.body.user.username) {
    return res.status(422).json({ errors: { email: "can't be blank" } });
  }

  if (!req.body.user.password) {
    return res.status(422).json({ errors: { password: "can't be blank" } });
  }

  console.log(req.body.user);

  passport.authenticate("local", { session: false }, (err, user, info) => {
    if (err) {
      return next(err);
    }

    if (user) {
      user.token = user.generateJWT();
      return res.json(user.toAuthJSON());
    } else {
      return res.status(403).json(info);
    }
  })(req, res, next);
});

//create user
router.post(
  "/",
  auth.required,
  userController.getUser,
  userController.grantAccess("createAny"),
  (req, res, next) => {
    const user = new User();

    user.username = req.body.user.username;
    user.email = req.body.user.email;
    user.setPassword(req.body.user.password);
    user.role = "supervisor";

    user
      .save()
      .then(function() {
        return res.status(201).json({ user: user.toAuthJSON() });
      })
      .catch(next);
  }
);

router.delete(
  "/",
  auth.required,
  userController.getUser,
  userController.grantAccess("deleteAny"),
  (req, res, next) => {
    let uid = req.body.userId;
    if (typeof uid === "undefined") {
      return res.sendStatus(400);
    }
    // console.log(req.payload)

    let objId;
    try {
      objId = mongoose.Types.ObjectId(uid);
    } catch (error) {
      return res.status(400).json({
        error: error
      });
    }
    // console.log(objId)
    User.findOneAndRemove({ _id: objId })
      .then(user => {
        console.log(user);
        if (!user) {
          return res.status(204).json({
            status: "user already gone"
          });
        }
        return res.status(204).json({
          user: user,
          status: "user deleted"
        });
      })
      .catch(next);
  }
);

module.exports = router;
