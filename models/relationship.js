const mongoose = require('mongoose')

const relationshipSchema = new mongoose.Schema({
  id: {
    type: Number,
    required: true,
  },
  friends:[Number],
  waitList: [Number],
  sentList: [Number]
})

module.exports = mongoose.model('Relationship', relationshipSchema)
