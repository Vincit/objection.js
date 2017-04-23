'use strict';

function decorate(obj, decorations) {
  decorations.forEach(dec => {
    dec.properties.forEach(prop => {
      if (typeof obj[prop] !== 'function') {
        throw new Error('You are doing it wrong');
      }

      let descriptor = {
        value: obj[prop]
      };

      descriptor = dec.decorator(obj, prop, descriptor) || descriptor;
      Object.defineProperty(obj, prop, descriptor);
    });
  });
}

module.exports = decorate;