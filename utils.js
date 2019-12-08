exports.isUndefined = varialble => {
  return typeof varialble === "undefined";
};

exports.isValid = varialble => {
  return !this.isUndefined(varialble) && varialble;
};
