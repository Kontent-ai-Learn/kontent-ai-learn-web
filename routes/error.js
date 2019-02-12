const commonContent = require('../helpers/commonContent');
const minify = require('../helpers/minify');
const helper = require('../helpers/helperFunctions');
const requestDelivery = require('../helpers/requestDelivery');

const error = async (req, res) => {
    const footer = await commonContent.getFooter(res);
    const UIMessages = await commonContent.getUIMessages(res);
    const KCDetails = commonContent.getKCDetails(res);

    if (!footer) {
        return res.status(500).send('Unexpected error, please check site logs.');
    }

    const content = await requestDelivery({
        type: 'not_found',
        ...KCDetails
    });

    const navigation = await requestDelivery({
        type: 'home',
        depth: 1,
        ...KCDetails
    });

    return res.render('pages/error', {
        req: req,
        minify: minify,
        navigation: navigation[0] ? navigation[0].navigation : [],
        title: content[0] ? content[0].title.value : '',
        content: content[0] ? content[0].content.value : '',
        footer: footer[0] ? footer[0] : {},
        UIMessages: UIMessages[0],
        helper: helper
    });
};

module.exports = error;
