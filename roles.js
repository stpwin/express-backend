const AccessControl = require("accesscontrol");

const ac = new AccessControl();

ac.grant("supervisor")
  .readAny("/api/customers")
  .createAny("/api/customers")
  .updateAny("/api/customers")
  // .deleteAny("/api/customers")

  .readOwn("/api/users")
  .updateOwn("/api/users");
// .deleteOwn("/api/users");

ac.grant("administrator")
  .extend("supervisor")
  .deleteAny("/api/customers")

  .createAny("/api/users")
  .readAny("/api/users")
  .updateAny("/api/users")
  .deleteAny("/api/users")

  .createOwn("/api/admin")
  .readOwn("/api/admin")
  .updateOwn("/api/admin")
  .deleteOwn("/api/admin")

  .createAny("/api/settings")
  .readAny("/api/settings")
  .updateAny("/api/settings")
  .deleteAny("/api/settings");

exports.roles = ac;