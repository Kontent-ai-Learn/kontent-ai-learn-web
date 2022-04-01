const minifier = require('html-minifier').minify;
const minifierOptions = {
    collapseWhitespace: true
};

const postprocessMarkup = (text, res) => {
    if (text) {
        return minifier(text, minifierOptions);
    } else {
        return '';
    }
};

module.exports = postprocessMarkup;
