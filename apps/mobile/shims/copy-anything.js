"use strict";
// CJS shim for copy-anything — Metro/React Native cannot bundle pure ESM.
// Implements the same deepCopy logic copy-anything provides.

function isPlainObject(val) {
  return val !== null && typeof val === "object" && !Array.isArray(val) &&
    Object.getPrototypeOf(val) === Object.prototype;
}

function copy(target, options) {
  if (Array.isArray(target)) {
    return target.map((item) => copy(item, options));
  }
  if (isPlainObject(target)) {
    const result = {};
    for (const key of Object.keys(target)) {
      result[key] = copy(target[key], options);
    }
    return result;
  }
  return target;
}

module.exports = { copy };
module.exports.default = copy;
module.exports.copy = copy;
