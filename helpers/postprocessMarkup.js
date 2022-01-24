const minifier = require('html-minifier').minify;
const minifierOptions = {
    collapseWhitespace: true
};

const helpers = require('./helperFunctions');

const postprocessMarkup = (text, res) => {
    if (text) {
        text = helpers.urlPrefixLinks(text, res);
        return minifier(text, minifierOptions);
    } else {
        return '';
    }
};

module.exports = postprocessMarkup;
