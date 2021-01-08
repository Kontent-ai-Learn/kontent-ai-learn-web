const axios = require('axios');

const recaptcha = {
    checkv2: async (data) => {
        if (process.env['Recaptcha-v2.secret']) {
            const settings = {
                secret: process.env['Recaptcha-v2.secret'],
                response: data['g-recaptcha-response']
            };

            const response = await axios({
                method: 'post',
                url: 'https://www.google.com/recaptcha/api/siteverify?secret=' + settings.secret + '&response=' + settings.response
            });

            if (response.data.success === true) {
                return true;
            }

            return false;
        } else {
            return true;
        }
    }
};

module.exports = recaptcha;
