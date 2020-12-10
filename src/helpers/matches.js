'use strict'

module.exports = (subject, pattern) => new RegExp(pattern).test(subject)
