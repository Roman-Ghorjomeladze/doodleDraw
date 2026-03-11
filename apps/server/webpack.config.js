const path = require('path');

module.exports = function (options) {
  // Filter the existing externals to allow @doodledraw/shared to be bundled
  const existingExternals = options.externals || [];

  const wrappedExternals = existingExternals.map((externalFn) => {
    if (typeof externalFn === 'function') {
      return function (ctx, callback) {
        const request = typeof ctx === 'string' ? ctx : ctx.request;
        if (request && request.startsWith('@doodledraw/shared')) {
          // Don't externalize - let webpack bundle it
          return callback();
        }
        return externalFn(ctx, callback);
      };
    }
    return externalFn;
  });

  return {
    ...options,
    externals: wrappedExternals,
    resolve: {
      ...options.resolve,
      alias: {
        ...options.resolve?.alias,
        '@doodledraw/shared': path.resolve(__dirname, '../../packages/shared/src'),
      },
    },
  };
};
