const axios = require('axios');

const recaptcha = {
    checkv2: async (data) => {
        if (process.env.RECAPTCHA_V2_SECRET) {
            const settings = {
                secret: process.env.RECAPTCHA_V2_SECRET,
                response: data['g-recaptcha-response']
            };

            const response = await axios({
                method: 'post',
                url: `https://www.google.com/recaptcha/api/siteverify?secret=${settings.secret}&response=${settings.response}`
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
