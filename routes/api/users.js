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

router.get(
  "/uid/:uid",
  auth.required,
  userController.getUser,
  userController.grantAccess("readAny"),
  (req, res, next) => {
    const { uid } = req.params;
    if (!uid) {
      return res.sendStatus(400);
    }

    User.findById(uid)
      .then(doc => {
        return res.json({
          username: doc.username,
          displayName: doc.displayName,
          description: doc.description,
          role: doc.role
        });
      })
      .catch(next);
  }
);

//get all users
router.get(
  "/all",
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

    User.aggregate(
      [
        {
          $match: {}
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
        if (!docs[0] || !docs[0].metadata[0]) {
          return res.sendStatus(204);
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
    ).catch(next);
  }
);

//get filter users
router.get(
  "/filter/:filterText",
  auth.required,
  userController.getUser,
  userController.grantAccess("readAny"),
  (req, res, next) => {
    const { filterText } = req.params;
    if (!filterText) {
      return res.sendStatus(204);
    }
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
            $or: [
              { displayName: { $regex: filterText, $options: "i" } },
              { username: { $regex: filterText, $options: "i" } }
            ]
          }
        },
        {
          $facet: {
            metadata: [{ $count: "total" }, { $addFields: { page: page } }],
            data: [{ $skip: offset }, { $limit: limit }]
          }
        }
      ],
      (err, docs) => {
        if (!docs[0] || !docs[0].metadata[0]) {
          // console.log(docs[0].metadata);
          return res.sendStatus(204);
        }

        // console.log(docs[0].metadata[0].total);

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
    ).catch(next);
  }
);

//update user
router.put(
  "/:uid",
  auth.required,
  userController.getUser,
  userController.grantAccess("updateAny"),
  (req, res, next) => {
    const { uid } = req.params;
    const { user } = req.body;
    console.log("body", req.body);

    if (!uid || !user) return res.sendStatus(422);

    User.findById(uid)
      .then(doc => {
        if (!doc) {
          return res.sendStatus(204);
        }

        if (isValid(user.username)) {
          doc.username = user.username;
        }

        if (isValid(user.displayName)) {
          doc.displayName = user.displayName;
        }

        if (isValid(user.description)) {
          doc.description = user.description;
        }

        if (isValid(user.role)) {
          doc.role = user.role;
        }

        if (isValid(user.password)) {
          doc.setPassword(user.password);
        }

        return doc.save().then(() => {
          return res.json({
            status: "success"
          });
        });
      })
      .catch(next);
  }
);

router.post("/login", (req, res, next) => {
  //login

  if (!req.body.user.username) {
    return res.status(422).json({ errors: { username: "can't be blank" } });
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

    if (!req.body.username)
      return res.status(422).json({ errors: { username: "can't be blank" } });
    if (!req.body.displayName)
      return res
        .status(422)
        .json({ errors: { displayName: "can't be blank" } });
    if (!req.body.role)
      return res.status(422).json({ errors: { role: "can't be blank" } });
    if (!req.body.password)
      return res.status(422).json({ errors: { password: "can't be blank" } });

    if (req.body.username && req.body.username.length < 3)
      return res
        .status(422)
        .json({ errors: { username: "require 3 character minimum" } });
    if (req.body.displayName && req.body.displayName.length < 3)
      return res
        .status(422)
        .json({ errors: { displayName: "require 3 character minimum" } });
    if (req.body.password && req.body.password.length < 6)
      return res
        .status(422)
        .json({ errors: { password: "require 6 character minimum" } });

    user.username = req.body.username;
    user.displayName = req.body.displayName;
    user.description = req.body.description;
    user.role = req.body.role;

    user.setPassword(req.body.password);

    user
      .save()
      .then(() => {
        return res
          .status(201)
          .json({ user: user.toAuthJSON(), status: "success" });
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
    const uid = req.body.uid;

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

    User.findOneAndRemove({ _id: objId })
      .then(user => {
        console.log(user);
        if (!user) {
          return res.sendStatus(204);
        }
        return res.sendStatus(204);
      })
      .catch(next);
  }
);

module.exports = router;
