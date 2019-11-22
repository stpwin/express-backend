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
  "/all?/:pageNo?",
  auth.required,
  userController.getUser,
  userController.grantAccess("readAny"),
  (req, res, next) => {
    let perPage = req.body.perPage || 50;
    if (perPage > 200) {
      perPage = 200;
    }
    let pageNo = parseInt(req.params.pageNo) || 1;

    User.count()
      .then(count => {
        const pages = parseInt(count / perPage) || 1;
        if (pageNo > pages) {
          pageNo = pages;
        }
        const skip = (pageNo - 1) * perPage;
        User.find({})
          .skip(skip)
          .limit(perPage)
          .then(users => {
            return res.json({
              users: users,
              pageNo: pageNo,
              pages: pages
            });
          })
          .catch(next);
      })
      .catch(next);
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
  if (!req.body.user.email) {
    return res.status(422).json({ errors: { email: "can't be blank" } });
  }

  if (!req.body.user.password) {
    return res.status(422).json({ errors: { password: "can't be blank" } });
  }

  passport.authenticate("local", { session: false }, (err, user, info) => {
    if (err) {
      return next(err);
    }

    if (user) {
      user.token = user.generateJWT();
      return res.json({ user: user.toAuthJSON() });
    } else {
      return res.status(422).json(info);
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
