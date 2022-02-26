const EventEmitter = require('events').EventEmitter;
const evt = new EventEmitter();

module.exports = {
  addItem: function (userId, itemId) {
    evt.emit('add', userId, itemId)
  },
  onAddItem: function (handler, userId, itemId) {
    evt.on('add', (userId, itemId) => {
      handler(userId, itemId)
    })
  },
  removeItem: function (userId, itemId) {
    evt.emit('remove', userId, itemId)
  },
  onRemoveItem: function (handler, userId, itemId) {
    evt.on('remove', (userId, itemId) => {
      handler(userId, itemId)
    })
  }
};